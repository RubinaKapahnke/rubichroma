import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormArray } from '@angular/forms';
import { decodeLegacyNotation } from '../../domain/legacy-notation-codec';
import { MusicEvent } from '../../domain/music-event';
import { SongStructureAction } from '../../domain/song-structure-editing';
import { LineForm, WordForm, WordSelection } from './song-editor-form';

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
  templateUrl: './song-sheet.component.html',
  styleUrl: './song-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongSheetComponent {
  readonly lines = input.required<FormArray<LineForm>>();
  readonly selection = input.required<WordSelection | null>();
  readonly selectedPositions = input.required<readonly WordSelection[]>();
  readonly melodyPositions = input<readonly WordSelection[]>([]);
  readonly touchSelectionActive = input.required<boolean>();
  readonly selectionChange = output<WordSelection | null>();
  readonly wordSelect = output<WordSelectionGesture>();
  readonly multiSelectionRequested = output<void>();
  readonly blockAddRequested = output<void>();
  readonly structureAction = output<SongStructureAction>();
  readonly structureHelpVisible = signal(readStructureHelpVisibility());
  readonly openLineMenuIndex = signal<number | null>(null);
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
    this.closeLineActions();
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
    if (event.pointerType !== 'touch' || !event.isPrimary) return;

    this.closeLineActions();
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

  toggleLineActions(event: MouseEvent, lineIndex: number): void {
    event.preventDefault();
    this.openLineMenuIndex.update((current) => (current === lineIndex ? null : lineIndex));
  }

  runStructureAction(action: SongStructureAction): void {
    this.closeLineActions();
    this.structureAction.emit(action);
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

  @HostListener('document:click', ['$event'])
  closeLineActionsOnOutsideClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('.line-actions')) this.closeLineActions();
  }

  @HostListener('document:keydown.escape')
  closeLineActions(): void {
    this.openLineMenuIndex.set(null);
  }

  eventLabel(event: MusicEvent): string {
    switch (event.kind) {
      case 'note':
        return formatPitch(event.pitch.degree, event.pitch.octave);
      case 'chord':
        return `(${event.pitches.map((pitch) => formatPitch(pitch.degree, pitch.octave)).join('')})`;
      case 'separator':
        return '–';
    }
  }

  wordEvents(word: WordForm): MusicEvent[] {
    return decodeLegacyNotation(word.controls.notation.value).events;
  }

  handleWordKeydown(event: KeyboardEvent, lineIndex: number, wordIndex: number): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeLineActions();
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
    this.closeLineActions();
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
