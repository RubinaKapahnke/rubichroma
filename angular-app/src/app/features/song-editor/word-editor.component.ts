import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { decodeLegacyNotation } from '../../domain/legacy-notation-codec';
import {
  deleteMusicEventsInSlotRange,
  eventAtMusicGridSlot,
  MUSIC_GRID_SLOTS_PER_BAR,
  musicGridLength,
  projectMusicEventsToGrid,
  replaceMusicEventAtSlot,
} from '../../domain/music-grid-editing';
import {
  durationLabel,
  eventDurationInBeats,
  hasParallelTineCollision,
  MusicEvent,
  musicEventTrack,
  MusicTrackId,
  Pitch,
} from '../../domain/music-event';
import {
  previewSyllableSplit,
  SongStructureAction,
  syllableSplitPoints,
} from '../../domain/song-structure-editing';

export interface KalimbaKeyView {
  id: string;
  value: string;
  letter: string;
  hand: 'L' | 'R';
  color: string;
  pitch: Pitch;
}

type InsertMode = 'single' | 'chord';
type GridSelection = {
  anchorTrack: MusicTrackId;
  anchorSlot: number;
  focusTrack: MusicTrackId;
  focusSlot: number;
};

const TRACKS = ['melody', 'accompaniment'] as const;
const DURATION_BY_CODE: Readonly<Record<string, number>> = {
  KeyZ: 4,
  KeyX: 2,
  KeyC: 1,
  KeyV: 0.5,
  KeyB: 0.25,
};
const TONE_INDEX_BY_CODE: Readonly<Record<string, number>> = {
  KeyH: 0,
  KeyG: 1,
  KeyJ: 2,
  KeyF: 3,
  KeyK: 4,
  KeyD: 5,
  KeyL: 6,
  KeyS: 7,
  Semicolon: 8,
  KeyA: 9,
  KeyI: 10,
  KeyE: 11,
  KeyO: 12,
  KeyW: 13,
  KeyP: 14,
  KeyQ: 15,
  BracketLeft: 16,
};

@Component({
  selector: 'app-word-editor',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './word-editor.component.html',
  styleUrl: './word-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WordEditorComponent {
  readonly textControl = input.required<FormControl<string>>();
  readonly notationControl = input.required<FormControl<string>>();
  readonly structuredEvents = input<readonly MusicEvent[] | null>(null);
  readonly location = input.required<string>();
  readonly testIdSuffix = input.required<string>();
  readonly keys = input.required<readonly KalimbaKeyView[]>();
  readonly isMelodyBlock = input.required<boolean>();
  readonly canDeleteBlock = input.required<boolean>();
  readonly canCopyToNextLine = input.required<boolean>();
  readonly canUndo = input.required<boolean>();
  readonly canRedo = input.required<boolean>();
  readonly closed = output<void>();
  readonly structureAction = output<SongStructureAction>();
  readonly musicEventRemovalRequested = output<{
    track: MusicTrackId;
    eventIndex: number;
  }>();
  readonly musicEventDurationRequested = output<{
    track: MusicTrackId;
    eventIndex: number;
    durationBeats: number;
  }>();
  readonly musicEventAppendRequested = output<{ event: MusicEvent; track: MusicTrackId }>();
  readonly musicGridEditRequested = output<Partial<Record<MusicTrackId, readonly MusicEvent[]>>>();
  readonly musicEventPreviewRequested = output<{
    track: MusicTrackId;
    eventIndex: number;
  }>();
  readonly pitchPreviewRequested = output<Pitch>();
  readonly blockPreviewRequested = output<void>();
  readonly undoRequested = output<void>();
  readonly redoRequested = output<void>();

  readonly insertMode = signal<InsertMode>('single');
  readonly activeTrack = signal<MusicTrackId>('melody');
  readonly trackOptions = TRACKS;
  readonly chordDraft = signal<Pitch[]>([]);
  readonly keyboardChordDraft = signal(false);
  readonly gridCursorSlot = signal(0);
  readonly gridSelection = signal<GridSelection | null>(null);
  readonly selectedDuration = signal(1);
  readonly notice = signal<string | null>(null);
  readonly moreActionsOpen = signal(false);
  readonly auditionKeys = signal(false);
  readonly splitIndex = signal<number | null>(null);
  readonly firstSplitMelodyCount = signal<number | null>(null);
  readonly firstSplitAccompanimentCount = signal<number | null>(null);
  readonly visibleTextControl = new FormControl('', { nonNullable: true });
  readonly leftKeys = computed(() => this.keys().filter((key) => key.hand === 'L'));
  readonly rightKeys = computed(() => this.keys().filter((key) => key.hand === 'R'));

  constructor() {
    effect((onCleanup) => {
      const source = this.textControl();
      const isMelody = this.isMelodyBlock();
      const present = (value: string): string => (isMelody && value === '♪' ? '' : value);
      this.visibleTextControl.setValue(present(source.value), { emitEvent: false });

      const visibleSubscription = this.visibleTextControl.valueChanges.subscribe((value) => {
        source.setValue(value);
      });
      const sourceSubscription = source.valueChanges.subscribe((value) => {
        const presented = present(value);
        if (this.visibleTextControl.value !== presented) {
          this.visibleTextControl.setValue(presented, { emitEvent: false });
        }
      });
      onCleanup(() => {
        visibleSubscription.unsubscribe();
        sourceSubscription.unsubscribe();
      });
    });

    effect(() => {
      this.testIdSuffix();
      this.moreActionsOpen.set(false);
      this.splitIndex.set(null);
      this.firstSplitMelodyCount.set(null);
      this.firstSplitAccompanimentCount.set(null);
      this.gridCursorSlot.set(0);
      this.gridSelection.set(null);
      this.keyboardChordDraft.set(false);
      this.chordDraft.set([]);
    });
  }

  events(): MusicEvent[] {
    return [
      ...(this.structuredEvents() ?? decodeLegacyNotation(this.notationControl().value).events),
    ];
  }

  eventCountLabel(): string {
    const count = this.events().length;
    return `${count} ${count === 1 ? 'Ereignis' : 'Ereignisse'}`;
  }

  splitPoints(): number[] {
    return syllableSplitPoints(this.visibleTextControl.value);
  }

  splitEventCounts(track: MusicTrackId): number[] {
    return Array.from({ length: this.eventsForTrack(track).length + 1 }, (_, index) => index);
  }

  selectedSplitIndex(): number {
    const points = this.splitPoints();
    const selected = this.splitIndex();
    return selected !== null && points.includes(selected)
      ? selected
      : (points[Math.floor(points.length / 2)] ?? 0);
  }

  selectedFirstEventCount(track: MusicTrackId): number {
    const counts = this.splitEventCounts(track);
    const selected =
      track === 'melody' ? this.firstSplitMelodyCount() : this.firstSplitAccompanimentCount();
    const fallback = track === 'melody' && counts.length > 1 ? 1 : 0;
    return selected !== null && counts.includes(selected) ? selected : fallback;
  }

  splitPreview(): { firstText: string; secondText: string } | null {
    return previewSyllableSplit(this.visibleTextControl.value, this.selectedSplitIndex());
  }

  previewSyllableSplitFor(splitIndex: number): { firstText: string; secondText: string } | null {
    return previewSyllableSplit(this.visibleTextControl.value, splitIndex);
  }

  canSplitSyllable(): boolean {
    return (
      !this.isMelodyBlock() &&
      !this.hasUnknownFragments() &&
      this.splitPoints().length > 0 &&
      this.events().filter((event) => event.kind !== 'separator').length >= 2
    );
  }

  canApplySyllableSplit(): boolean {
    const melodyCount = this.selectedFirstEventCount('melody');
    const accompanimentCount = this.selectedFirstEventCount('accompaniment');
    const first = [
      ...this.eventsForTrack('melody').slice(0, melodyCount),
      ...this.eventsForTrack('accompaniment').slice(0, accompanimentCount),
    ];
    const second = [
      ...this.eventsForTrack('melody').slice(melodyCount),
      ...this.eventsForTrack('accompaniment').slice(accompanimentCount),
    ];
    return (
      first.some(({ event }) => event.kind !== 'separator') &&
      second.some(({ event }) => event.kind !== 'separator')
    );
  }

  setSplitIndex(value: string): void {
    this.splitIndex.set(Number(value));
  }

  setFirstSplitEventCount(track: MusicTrackId, value: string): void {
    (track === 'melody' ? this.firstSplitMelodyCount : this.firstSplitAccompanimentCount).set(
      Number(value),
    );
  }

  splitSyllable(): void {
    if (!this.canSplitSyllable() || !this.canApplySyllableSplit()) return;
    this.structureAction.emit({
      kind: 'split-block',
      splitIndex: this.selectedSplitIndex(),
      firstEventCounts: {
        melody: this.selectedFirstEventCount('melody'),
        accompaniment: this.selectedFirstEventCount('accompaniment'),
      },
    });
  }

  toggleMoreActions(event: MouseEvent): void {
    event.preventDefault();
    this.moreActionsOpen.update((open) => !open);
  }

  runStructureAction(action: SongStructureAction): void {
    this.moreActionsOpen.set(false);
    this.structureAction.emit(action);
  }

  @HostListener('document:click', ['$event'])
  closeMoreActionsOnOutsideClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('.more-block-actions')) {
      this.moreActionsOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeMoreActions(): void {
    this.moreActionsOpen.set(false);
  }

  hasUnknownFragments(): boolean {
    return decodeLegacyNotation(this.notationControl().value).hasUnknownFragments;
  }

  setInsertMode(mode: InsertMode): void {
    if (mode === 'chord' && this.activeTrack() !== 'accompaniment') {
      this.notice.set('Akkorde können nur in der Begleitung eingefügt werden.');
      return;
    }
    this.insertMode.set(mode);
    this.chordDraft.set([]);
    this.notice.set(null);
  }

  setActiveTrack(track: MusicTrackId): void {
    this.activeTrack.set(track);
    if (track === 'melody') this.insertMode.set('single');
    this.chordDraft.set([]);
    this.notice.set(null);
  }

  gridEvents(track: MusicTrackId) {
    return projectMusicEventsToGrid(this.trackEvents(track));
  }

  gridSlots(): number[] {
    const length = Math.max(
      MUSIC_GRID_SLOTS_PER_BAR,
      ...TRACKS.map((track) => musicGridLength(this.trackEvents(track))),
      this.gridCursorSlot() + 1,
    );
    return Array.from({ length }, (_, index) => index);
  }

  gridTemplateColumns(): string {
    return `repeat(${this.gridSlots().length}, minmax(1.1rem, 1fr))`;
  }

  gridStatus(): string {
    const selection = this.gridSelection();
    const draft = this.keyboardChordDraft() ? `, Akkordentwurf ${this.draftLabel()}` : '';
    return `${this.trackLabel(this.activeTrack())}, Rasterposition ${this.gridCursorSlot() + 1}, ${durationLabel(this.selectedDuration())}${selection ? ', Auswahl aktiv' : ''}${draft}`;
  }

  isGridCursor(track: MusicTrackId, slot: number): boolean {
    return this.activeTrack() === track && this.gridCursorSlot() === slot;
  }

  isGridSlotSelected(track: MusicTrackId, slot: number): boolean {
    const selection = this.gridSelection();
    if (!selection) return false;
    const firstTrack = Math.min(
      TRACKS.indexOf(selection.anchorTrack),
      TRACKS.indexOf(selection.focusTrack),
    );
    const lastTrack = Math.max(
      TRACKS.indexOf(selection.anchorTrack),
      TRACKS.indexOf(selection.focusTrack),
    );
    const firstSlot = Math.min(selection.anchorSlot, selection.focusSlot);
    const lastSlot = Math.max(selection.anchorSlot, selection.focusSlot);
    const trackIndex = TRACKS.indexOf(track);
    return (
      trackIndex >= firstTrack && trackIndex <= lastTrack && slot >= firstSlot && slot <= lastSlot
    );
  }

  focusGridSlot(event: MouseEvent, track: MusicTrackId, slot: number): void {
    this.setActiveTrack(track);
    this.gridCursorSlot.set(slot);
    this.gridSelection.set(null);
    (event.currentTarget as HTMLElement).closest<HTMLElement>('[role="grid"]')?.focus();
  }

  handleMusicGridKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') return;

    const toneKey = this.toneKeyForCode(event.code);
    if (this.keyboardChordDraft()) {
      if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && toneKey) {
        event.preventDefault();
        this.toggleDraftPitch(toneKey.pitch);
        this.pitchPreviewRequested.emit(toneKey.pitch);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        this.confirmKeyboardChord();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.cancelKeyboardChord();
      }
      return;
    }

    if (
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey &&
      DURATION_BY_CODE[event.code]
    ) {
      event.preventDefault();
      this.chooseGridDuration(DURATION_BY_CODE[event.code]);
      return;
    }
    if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && toneKey) {
      event.preventDefault();
      if (this.activeTrack() !== 'accompaniment') {
        this.notice.set('Akkordentwürfe sind nur in der Begleitung möglich.');
        return;
      }
      this.keyboardChordDraft.set(true);
      this.chordDraft.set([{ ...toneKey.pitch }]);
      this.notice.set(null);
      this.pitchPreviewRequested.emit(toneKey.pitch);
      return;
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && toneKey) {
      event.preventDefault();
      this.placeGridEvent({
        kind: 'note',
        pitch: toneKey.pitch,
        duration: this.selectedDuration(),
      });
      this.pitchPreviewRequested.emit(toneKey.pitch);
      return;
    }
    if (
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.shiftKey &&
      (event.code === 'Digit0' || event.code === 'Numpad0')
    ) {
      event.preventDefault();
      this.deleteGridCursorOrSelection();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.deleteGridCursorOrSelection();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (this.gridSelection()) this.gridSelection.set(null);
      else (event.currentTarget as HTMLElement).blur();
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;

    event.preventDefault();
    event.stopPropagation();
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    if (event.shiftKey && !this.gridSelection()) {
      this.gridSelection.set({
        anchorTrack: this.activeTrack(),
        anchorSlot: this.gridCursorSlot(),
        focusTrack: this.activeTrack(),
        focusSlot: this.gridCursorSlot(),
      });
    } else if (!event.shiftKey) {
      this.gridSelection.set(null);
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const nextTrack =
        TRACKS[
          Math.max(0, Math.min(TRACKS.length - 1, TRACKS.indexOf(this.activeTrack()) + direction))
        ];
      this.activeTrack.set(nextTrack);
    } else if (event.altKey && !event.ctrlKey && !event.metaKey) {
      this.moveToGridEvent(direction);
    } else if (event.ctrlKey || event.metaKey) {
      this.moveToGridBoundary(direction);
    } else {
      this.gridCursorSlot.update((slot) =>
        Math.max(0, Math.min(this.gridSlots().length - 1, slot + direction)),
      );
    }
    if (event.shiftKey) {
      this.gridSelection.update((selection) =>
        selection
          ? {
              ...selection,
              focusTrack: this.activeTrack(),
              focusSlot: this.gridCursorSlot(),
            }
          : null,
      );
    }
  }

  handleKey(key: KalimbaKeyView): void {
    if (this.auditionKeys()) this.pitchPreviewRequested.emit(key.pitch);
    if (this.insertMode() === 'single') {
      this.append({ kind: 'note', pitch: key.pitch, duration: 1 });
      return;
    }

    this.chordDraft.update((draft) =>
      draft.some((pitch) => samePitch(pitch, key.pitch))
        ? draft.filter((pitch) => !samePitch(pitch, key.pitch))
        : [...draft, { ...key.pitch }],
    );
    this.notice.set(null);
  }

  insertChord(): void {
    const pitches = this.chordDraft();
    if (pitches.length < 2) return;
    this.append({ kind: 'chord', pitches, duration: 1 });
    this.chordDraft.set([]);
  }

  private chooseGridDuration(duration: number): void {
    this.selectedDuration.set(duration);
    const occupied = eventAtMusicGridSlot(
      this.trackEvents(this.activeTrack()),
      this.gridCursorSlot(),
    );
    if (!occupied || occupied.event.kind === 'separator') return;
    const replacement = { ...occupied.event, duration } as MusicEvent;
    const next = [...this.trackEvents(this.activeTrack())];
    next[occupied.eventIndex] = replacement;
    this.musicGridEditRequested.emit({ [this.activeTrack()]: next });
  }

  private placeGridEvent(event: MusicEvent): void {
    if (this.hasUnknownFragments()) {
      this.notice.set('Unbekannte Legacy-Fragmente verhindern die sichere Rasterbearbeitung.');
      return;
    }
    const track = this.activeTrack();
    const occupied = eventAtMusicGridSlot(this.trackEvents(track), this.gridCursorSlot());
    const startSlot = occupied?.startSlot ?? musicGridLength(this.trackEvents(track));
    const next = replaceMusicEventAtSlot(this.trackEvents(track), this.gridCursorSlot(), event);
    this.musicGridEditRequested.emit({ [track]: next });
    this.gridCursorSlot.set(startSlot + Math.max(1, Math.round(this.selectedDuration() * 4)));
    this.gridSelection.set(null);
    this.notice.set(null);
  }

  private deleteGridCursorOrSelection(): void {
    const selection = this.gridSelection();
    const tracks = selection
      ? TRACKS.slice(
          Math.min(TRACKS.indexOf(selection.anchorTrack), TRACKS.indexOf(selection.focusTrack)),
          Math.max(TRACKS.indexOf(selection.anchorTrack), TRACKS.indexOf(selection.focusTrack)) + 1,
        )
      : [this.activeTrack()];
    const fromSlot = selection ? selection.anchorSlot : this.gridCursorSlot();
    const toSlot = selection ? selection.focusSlot : this.gridCursorSlot();
    const replacements: Partial<Record<MusicTrackId, readonly MusicEvent[]>> = {};
    for (const track of tracks) {
      const current = this.trackEvents(track);
      const next = deleteMusicEventsInSlotRange(current, fromSlot, toSlot);
      if (next.length !== current.length) replacements[track] = next;
    }
    if (Object.keys(replacements).length) this.musicGridEditRequested.emit(replacements);
    this.gridSelection.set(null);
  }

  private confirmKeyboardChord(): void {
    const pitches = this.chordDraft();
    if (pitches.length < 2) {
      this.notice.set('Wähle mindestens zwei Töne für den Akkord.');
      return;
    }
    this.placeGridEvent({ kind: 'chord', pitches, duration: this.selectedDuration() });
    this.cancelKeyboardChord();
  }

  private cancelKeyboardChord(): void {
    this.keyboardChordDraft.set(false);
    this.chordDraft.set([]);
    this.notice.set(null);
  }

  private toggleDraftPitch(pitch: Pitch): void {
    this.chordDraft.update((draft) =>
      draft.some((candidate) => samePitch(candidate, pitch))
        ? draft.filter((candidate) => !samePitch(candidate, pitch))
        : [...draft, { ...pitch }],
    );
  }

  private moveToGridEvent(direction: number): void {
    const starts = this.gridEvents(this.activeTrack()).map((entry) => entry.startSlot);
    const target =
      direction > 0
        ? starts.find((slot) => slot > this.gridCursorSlot())
        : [...starts].reverse().find((slot) => slot < this.gridCursorSlot());
    if (target !== undefined) this.gridCursorSlot.set(target);
  }

  private moveToGridBoundary(direction: number): void {
    const slot = this.gridCursorSlot();
    const length = Math.max(...TRACKS.map((track) => musicGridLength(this.trackEvents(track))));
    const target =
      direction > 0
        ? Math.min(
            length,
            Math.floor(slot / MUSIC_GRID_SLOTS_PER_BAR + 1) * MUSIC_GRID_SLOTS_PER_BAR,
          )
        : Math.max(0, Math.ceil(slot / MUSIC_GRID_SLOTS_PER_BAR - 1) * MUSIC_GRID_SLOTS_PER_BAR);
    this.gridCursorSlot.set(target);
  }

  private toneKeyForCode(code: string): KalimbaKeyView | undefined {
    let index = TONE_INDEX_BY_CODE[code];
    const digit = /^(?:Digit|Numpad)([1-9])$/.exec(code);
    if (digit) index = Number(digit[1]) - 1;
    if (index === undefined) return undefined;
    return [...this.keys()].sort(
      (left, right) =>
        left.pitch.octave - right.pitch.octave || left.pitch.degree - right.pitch.degree,
    )[index];
  }

  private trackEvents(track: MusicTrackId): MusicEvent[] {
    return this.eventsForTrack(track).map(({ event }) => event);
  }

  insertSeparator(): void {
    this.append({ kind: 'separator' });
  }

  removeEvent(track: MusicTrackId, eventIndex: number): void {
    this.musicEventRemovalRequested.emit({ track, eventIndex });
  }

  previewEvent(track: MusicTrackId, eventIndex: number): void {
    this.musicEventPreviewRequested.emit({ track, eventIndex });
  }

  setEventDuration(track: MusicTrackId, eventIndex: number, duration: string): void {
    this.musicEventDurationRequested.emit({ track, eventIndex, durationBeats: Number(duration) });
  }

  eventDurationBeats(event: MusicEvent): number {
    return event.kind === 'separator' ? 1 : eventDurationInBeats(event);
  }

  eventDurationLabel(event: MusicEvent): string {
    return event.kind === 'separator' ? 'Keine Dauer' : durationLabel(event.duration);
  }

  isPitchUsed(pitch: Pitch): boolean {
    return this.eventsForTrack(this.activeTrack()).some(({ event }) => {
      if (event.kind === 'note') return samePitch(event.pitch, pitch);
      if (event.kind === 'chord') return event.pitches.some((item) => samePitch(item, pitch));
      return false;
    });
  }

  isPitchInDraft(pitch: Pitch): boolean {
    return this.chordDraft().some((item) => samePitch(item, pitch));
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

  eventKindLabel(event: MusicEvent): string {
    switch (event.kind) {
      case 'note':
        return 'Ton';
      case 'chord':
        return 'Akkord';
      case 'separator':
        return 'Trenner';
    }
  }

  eventColors(event: MusicEvent): string[] {
    const pitches =
      event.kind === 'note' ? [event.pitch] : event.kind === 'chord' ? event.pitches : [];
    return pitches.flatMap((pitch) => {
      const key = this.keys().find((candidate) => samePitch(candidate.pitch, pitch));
      return key ? [key.color] : [];
    });
  }

  keyInkColor(color: string): '#171a2b' | '#ffffff' {
    return profileInkColor(color);
  }

  draftLabel(): string {
    return (
      this.chordDraft()
        .map((pitch) => this.pitchLabel(pitch))
        .join(' + ') || 'Noch keine Töne gewählt'
    );
  }

  eventsForTrack(track: MusicTrackId): { event: MusicEvent; index: number; trackIndex: number }[] {
    let trackIndex = 0;
    return this.events().flatMap((event, index) =>
      musicEventTrack(event) === track ? [{ event, index, trackIndex: trackIndex++ }] : [],
    );
  }

  copyActiveTrackToNextLine(): void {
    this.runStructureAction({ kind: 'copy-events-to-next-line', track: this.activeTrack() });
  }

  trackLabel(track: MusicTrackId): string {
    return track === 'melody' ? 'Melodie' : 'Akkord / Begleitung';
  }

  parallelCollisionWarning(): string | null {
    return hasParallelTineCollision(this.events())
      ? 'Importhinweis: Dieselbe Kalimba-Zunge liegt in beiden Spuren auf demselben Anschlag. Die Daten bleiben erhalten; ändere vor dem Abspielen eine der beiden Spuren.'
      : null;
  }

  private append(event: MusicEvent): void {
    if (this.hasUnknownFragments()) {
      this.notice.set(
        'Diese Notation enthält unbekannte Legacy-Fragmente. Bearbeite sie zuerst im Textfeld, damit nichts verloren geht.',
      );
      return;
    }
    this.musicEventAppendRequested.emit({ event, track: this.activeTrack() });
    this.notice.set(null);
  }

  private pitchLabel(pitch: Pitch): string {
    const key = this.keys().find((candidate) => samePitch(candidate.pitch, pitch));
    return key ? `${key.letter} · ${formatPitch(pitch)}` : formatPitch(pitch);
  }
}

function samePitch(left: Pitch, right: Pitch): boolean {
  return left.degree === right.degree && left.octave === right.octave;
}

function formatPitch(pitch: Pitch): string {
  return `${pitch.degree}${pitch.octave === 0 ? '' : pitch.octave === 1 ? '′' : '″'}`;
}

export function profileInkColor(color: string): '#171a2b' | '#ffffff' {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (!match) return '#171a2b';
  const channels = match.slice(1).map((channel) => Number.parseInt(channel, 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const darkContrast = (luminance + 0.05) / 0.057;
  const lightContrast = 1.05 / (luminance + 0.05);
  return darkContrast >= lightContrast ? '#171a2b' : '#ffffff';
}
