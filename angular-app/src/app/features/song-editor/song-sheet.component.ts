import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  TemplateRef,
} from '@angular/core';
import { FormArray } from '@angular/forms';
import {
  durationLabel,
  eventDurationInBeats,
  MusicEvent,
  MusicTrackId,
  Pitch,
} from '../../domain/music-event';
import { SongDocument, songWordEventsForTrack } from '../../domain/song-document';
import { SongStructureAction } from '../../domain/song-structure-editing';
import { LineForm, WordForm, WordSelection } from './song-editor-form';
import { KalimbaKeyView, profileInkColor } from './word-editor.component';

export interface WordSelectionGesture {
  position: WordSelection;
  shiftKey: boolean;
  toggleKey: boolean;
  touchSelection: boolean;
}

const LONG_PRESS_DURATION_MS = 500;
const LONG_PRESS_MOVE_TOLERANCE_PX = 12;
export const SONG_STRUCTURE_HELP_HIDDEN_KEY = 'rubichroma-song-structure-help-hidden-v1';

@Component({
  selector: 'app-song-sheet',
  imports: [NgTemplateOutlet],
  templateUrl: './song-sheet.component.html',
  styleUrl: './song-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongSheetComponent {
  readonly lines = input.required<FormArray<LineForm>>();
  readonly document = input.required<SongDocument>();
  readonly keys = input<readonly KalimbaKeyView[]>([]);
  readonly editMode = input(false);
  readonly selection = input.required<WordSelection | null>();
  readonly selectedPositions = input.required<readonly WordSelection[]>();
  readonly melodyPositions = input<readonly WordSelection[]>([]);
  readonly touchSelectionActive = input.required<boolean>();
  readonly editorTemplate = input<TemplateRef<unknown> | null>(null);
  readonly selectionChange = output<WordSelection | null>();
  readonly wordSelect = output<WordSelectionGesture>();
  readonly multiSelectionRequested = output<void>();
  readonly blockAddRequested = output<void>();
  readonly structureAction = output<SongStructureAction>();
  readonly wordPreviewRequested = output<WordSelection>();
  readonly linePreviewRequested = output<number>();
  readonly structureHelpVisible = signal(readStructureHelpVisibility());
  readonly draggedBlock = signal<WordSelection | null>(null);
  readonly blockDropTarget = signal<WordSelection | null>(null);
  readonly blockDropAfter = signal(false);
  readonly draggedLine = signal<number | null>(null);
  readonly lineDropTarget = signal<number | null>(null);
  readonly lineDropAfter = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  private longPressTimer: ReturnType<typeof setTimeout> | undefined;
  private touchPointerId: number | null = null;
  private touchStart: { x: number; y: number } | null = null;
  private touchClickPending = false;
  private suppressNextTouchClick = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.cancelLongPress());
  }

  selectWord(event: MouseEvent, lineIndex: number, wordIndex: number): void {
    if (!this.editMode()) return;
    const isTouchClick =
      this.touchClickPending ||
      (typeof PointerEvent !== 'undefined' &&
        event instanceof PointerEvent &&
        event.pointerType === 'touch');
    this.touchClickPending = false;

    if (isTouchClick && this.suppressNextTouchClick) {
      this.suppressNextTouchClick = false;
      return;
    }

    const continueTouchSelection = this.touchSelectionActive();
    this.wordSelect.emit({
      position: { lineIndex, wordIndex },
      shiftKey: event.shiftKey,
      toggleKey: event.ctrlKey || event.metaKey || continueTouchSelection,
      touchSelection: continueTouchSelection,
    });
  }

  startLongPress(event: PointerEvent, lineIndex: number, wordIndex: number): void {
    if (!this.editMode() || event.pointerType !== 'touch' || !event.isPrimary) return;

    this.cancelLongPress();
    this.suppressNextTouchClick = false;
    this.touchPointerId = event.pointerId;
    this.touchStart = { x: event.clientX, y: event.clientY };
    this.touchClickPending = true;
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = undefined;
      this.suppressNextTouchClick = true;
      this.wordSelect.emit({
        position: { lineIndex, wordIndex },
        shiftKey: false,
        toggleKey: true,
        touchSelection: true,
      });
    }, LONG_PRESS_DURATION_MS);
  }

  trackLongPress(event: PointerEvent): void {
    if (event.pointerId !== this.touchPointerId || !this.touchStart) return;
    const moved = Math.hypot(event.clientX - this.touchStart.x, event.clientY - this.touchStart.y);
    if (moved > LONG_PRESS_MOVE_TOLERANCE_PX) this.cancelLongPress();
  }

  finishLongPress(event: PointerEvent): void {
    if (event.pointerId !== this.touchPointerId) return;
    this.cancelLongPress(false);
  }

  preventTouchContextMenu(event: Event): void {
    if (this.suppressNextTouchClick) event.preventDefault();
  }

  isSelected(lineIndex: number, wordIndex: number): boolean {
    return this.selectedPositions().some(
      (position) => position.lineIndex === lineIndex && position.wordIndex === wordIndex,
    );
  }

  isActive(lineIndex: number, wordIndex: number): boolean {
    const selection = this.selection();
    return selection?.lineIndex === lineIndex && selection.wordIndex === wordIndex;
  }

  isMelody(lineIndex: number, wordIndex: number): boolean {
    return this.melodyPositions().some(
      (position) => position.lineIndex === lineIndex && position.wordIndex === wordIndex,
    );
  }

  wordLabel(word: WordForm, lineIndex: number, wordIndex: number): string {
    const text = word.controls.text.value.trim();
    if (this.isMelody(lineIndex, wordIndex) && (!text || text === '♪')) return 'Melodieblock';
    return text || 'Leerer Textblock';
  }

  textRowLabel(word: WordForm): string {
    const text = word.controls.text.value.trim();
    return !text || text === '♪' ? 'Textloser Abschnitt' : text;
  }

  runStructureAction(action: SongStructureAction): void {
    this.structureAction.emit(action);
  }

  previewWord(event: MouseEvent, lineIndex: number, wordIndex: number): void {
    event.stopPropagation();
    this.wordPreviewRequested.emit({ lineIndex, wordIndex });
  }

  previewLine(event: MouseEvent, lineIndex: number): void {
    event.stopPropagation();
    this.linePreviewRequested.emit(lineIndex);
  }

  hasPlayableEvents(lineIndex: number, wordIndex: number): boolean {
    return this.trackOptions.some((track) =>
      this.eventsForTrack(lineIndex, wordIndex, track).some((event) => event.kind !== 'separator'),
    );
  }

  startBlockDrag(event: DragEvent, lineIndex: number, wordIndex: number): void {
    event.stopPropagation();
    event.dataTransfer?.setData('text/plain', `block:${lineIndex}:${wordIndex}`);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    this.draggedBlock.set({ lineIndex, wordIndex });
  }

  markBlockDrop(event: DragEvent, lineIndex: number, wordIndex: number): void {
    if (!this.draggedBlock()) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const target = event.currentTarget as HTMLElement;
    const after = event.clientX >= target.getBoundingClientRect().left + target.offsetWidth / 2;
    this.blockDropTarget.set({ lineIndex, wordIndex });
    this.blockDropAfter.set(after);
  }

  dropBlockNative(event: DragEvent): void {
    const source = this.draggedBlock();
    const target = this.blockDropTarget();
    const dropAfter = this.blockDropAfter();
    event.preventDefault();
    event.stopPropagation();
    this.clearDragState();
    if (!source || !target) return;
    let targetWordIndex = target.wordIndex + (dropAfter ? 1 : 0);
    if (source.lineIndex === target.lineIndex && source.wordIndex < targetWordIndex) {
      targetWordIndex -= 1;
    }
    if (source.lineIndex === target.lineIndex && source.wordIndex === targetWordIndex) return;
    this.structureAction.emit({
      kind: 'move-block',
      lineIndex: source.lineIndex,
      wordIndex: source.wordIndex,
      targetLineIndex: target.lineIndex,
      targetWordIndex,
    });
  }

  startLineDrag(event: DragEvent, lineIndex: number): void {
    event.stopPropagation();
    event.dataTransfer?.setData('text/plain', `line:${lineIndex}`);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    this.draggedLine.set(lineIndex);
  }

  markLineDrop(event: DragEvent, lineIndex: number): void {
    if (this.draggedLine() === null) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const target = event.currentTarget as HTMLElement;
    const after = event.clientY >= target.getBoundingClientRect().top + target.offsetHeight / 2;
    this.lineDropTarget.set(lineIndex);
    this.lineDropAfter.set(after);
  }

  dropLineNative(event: DragEvent): void {
    const sourceLineIndex = this.draggedLine();
    let targetLineIndex = this.lineDropTarget();
    const dropAfter = this.lineDropAfter();
    event.preventDefault();
    this.clearDragState();
    if (sourceLineIndex === null || targetLineIndex === null) return;
    targetLineIndex += dropAfter ? 1 : 0;
    if (sourceLineIndex < targetLineIndex) targetLineIndex -= 1;
    if (sourceLineIndex === targetLineIndex) return;
    this.structureAction.emit({ kind: 'move-line', lineIndex: sourceLineIndex, targetLineIndex });
  }

  clearDragState(): void {
    this.draggedBlock.set(null);
    this.blockDropTarget.set(null);
    this.blockDropAfter.set(false);
    this.draggedLine.set(null);
    this.lineDropTarget.set(null);
    this.lineDropAfter.set(false);
  }

  isBlockDropTarget(lineIndex: number, wordIndex: number): boolean {
    const target = this.blockDropTarget();
    return target?.lineIndex === lineIndex && target.wordIndex === wordIndex;
  }

  isLineDropTarget(lineIndex: number): boolean {
    const target = this.lineDropTarget();
    return target === lineIndex;
  }

  moveBlockWithKeyboard(event: KeyboardEvent, lineIndex: number, wordIndex: number): void {
    if (!event.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      return;
    }
    const line = this.lines().at(lineIndex);
    let targetLineIndex = lineIndex;
    let targetWordIndex = wordIndex;
    if (event.key === 'ArrowLeft') targetWordIndex -= 1;
    if (event.key === 'ArrowRight') targetWordIndex += 1;
    if (event.key === 'ArrowUp') targetLineIndex -= 1;
    if (event.key === 'ArrowDown') targetLineIndex += 1;
    const targetLine = this.lines().at(targetLineIndex);
    if (!line || !targetLine) return;
    if (targetLineIndex !== lineIndex) {
      if (line.controls.words.length === 1) return;
      targetWordIndex = Math.min(wordIndex, targetLine.controls.words.length);
    }
    const maximumTargetIndex =
      targetLineIndex === lineIndex
        ? line.controls.words.length - 1
        : targetLine.controls.words.length;
    if (targetWordIndex < 0 || targetWordIndex > maximumTargetIndex) return;
    event.preventDefault();
    event.stopPropagation();
    this.structureAction.emit({
      kind: 'move-block',
      lineIndex,
      wordIndex,
      targetLineIndex,
      targetWordIndex,
    });
  }

  moveLineWithKeyboard(event: KeyboardEvent, lineIndex: number): void {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const targetLineIndex = lineIndex + (event.key === 'ArrowUp' ? -1 : 1);
    if (targetLineIndex < 0 || targetLineIndex >= this.lines().length) return;
    event.preventDefault();
    event.stopPropagation();
    this.structureAction.emit({ kind: 'move-line', lineIndex, targetLineIndex });
  }

  dismissStructureHelp(): void {
    this.structureHelpVisible.set(false);
    try {
      localStorage.setItem(SONG_STRUCTURE_HELP_HIDDEN_KEY, 'true');
    } catch {
      // The help remains dismissible for this session when storage is unavailable.
    }
  }

  showStructureHelp(): void {
    this.structureHelpVisible.set(true);
    try {
      localStorage.removeItem(SONG_STRUCTURE_HELP_HIDDEN_KEY);
    } catch {
      // The visible state still changes for this session.
    }
  }

  readonly trackOptions: readonly MusicTrackId[] = ['melody', 'accompaniment'];

  trackLabel(track: MusicTrackId): string {
    return track === 'melody' ? 'Melodie' : 'Begleitung';
  }

  eventsForTrack(lineIndex: number, wordIndex: number, track: MusicTrackId): readonly MusicEvent[] {
    const word = this.document().song.lines[lineIndex]?.words[wordIndex];
    return word ? songWordEventsForTrack(word, track) : [];
  }

  wordSlotCount(lineIndex: number, wordIndex: number): number {
    return Math.max(
      1,
      ...this.trackOptions.map((track) =>
        this.eventsForTrack(lineIndex, wordIndex, track).reduce(
          (slots, event) => slots + this.eventSlotCount(event),
          0,
        ),
      ),
    );
  }

  eventSlotCount(event: MusicEvent): number {
    return event.kind === 'separator'
      ? 1
      : Math.max(1, Math.round(eventDurationInBeats(event) * 4));
  }

  eventLabel(event: MusicEvent): string {
    switch (event.kind) {
      case 'note':
        return this.pitchLabel(event.pitch);
      case 'chord':
        return event.pitches.map((pitch) => this.pitchLabel(pitch)).join(' + ');
      case 'separator':
        return '–';
    }
  }

  eventDurationLabel(event: MusicEvent): string {
    return event.kind === 'separator' ? 'Pause' : durationLabel(event.duration);
  }

  eventColors(event: MusicEvent): string[] {
    if (event.kind === 'separator') return [];
    return (event.kind === 'note' ? [event.pitch] : event.pitches).map(
      (pitch) => this.keyForPitch(pitch)?.color ?? '#ece8f0',
    );
  }

  eventPrimaryColor(event: MusicEvent): string {
    return this.eventColors(event)[0] ?? 'transparent';
  }

  eventInkColor(event: MusicEvent): string {
    return profileInkColor(this.eventPrimaryColor(event));
  }

  pitchLabel(pitch: Pitch): string {
    const key = this.keyForPitch(pitch);
    return key ? `${key.letter} · ${key.value}` : formatPitch(pitch.degree, pitch.octave);
  }

  wordAccessibleLabel(word: WordForm, lineIndex: number, wordIndex: number): string {
    const tracks = this.trackOptions
      .map((track) => {
        const events = this.eventsForTrack(lineIndex, wordIndex, track);
        return `${this.trackLabel(track)}: ${
          events.length ? events.map((event) => this.eventLabel(event)).join(', ') : 'leer'
        }`;
      })
      .join('; ');
    return `${this.wordLabel(word, lineIndex, wordIndex)}, ${tracks}`;
  }

  private keyForPitch(pitch: Pitch): KalimbaKeyView | undefined {
    return this.keys().find(
      (key) => key.pitch.degree === pitch.degree && key.pitch.octave === pitch.octave,
    );
  }

  handleWordKeydown(event: KeyboardEvent, lineIndex: number, wordIndex: number): void {
    if (event.altKey) {
      this.moveBlockWithKeyboard(event, lineIndex, wordIndex);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.selectionChange.emit(null);
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    const positions = this.lines().controls.flatMap((line, currentLineIndex) =>
      line.controls.words.controls.map((_, currentWordIndex) => ({
        lineIndex: currentLineIndex,
        wordIndex: currentWordIndex,
      })),
    );
    const currentIndex = positions.findIndex(
      (position) => position.lineIndex === lineIndex && position.wordIndex === wordIndex,
    );
    const target = positions[currentIndex + (event.key === 'ArrowRight' ? 1 : -1)];
    if (!target) return;

    event.preventDefault();
    this.selectionChange.emit(target);
    queueMicrotask(() =>
      document
        .querySelector<HTMLElement>(
          `[data-testid="word-card-${target.lineIndex}-${target.wordIndex}"]`,
        )
        ?.focus(),
    );
  }

  private cancelLongPress(clearPendingClick = true): void {
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    this.longPressTimer = undefined;
    this.touchPointerId = null;
    this.touchStart = null;
    if (clearPendingClick) this.touchClickPending = false;
  }
}

function readStructureHelpVisibility(): boolean {
  try {
    return localStorage.getItem(SONG_STRUCTURE_HELP_HIDDEN_KEY) !== 'true';
  } catch {
    return true;
  }
}

function formatPitch(degree: number, octave: number): string {
  return `${degree}${octave === 0 ? '' : octave === 1 ? '′' : '″'}`;
}
