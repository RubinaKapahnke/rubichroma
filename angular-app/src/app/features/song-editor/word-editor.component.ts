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
  durationLabel,
  eventDurationInBeats,
  hasParallelTineCollision,
  MusicEvent,
  musicEventTrack,
  MusicTrackId,
  Pitch,
} from '../../domain/music-event';
import { SongStructureAction } from '../../domain/song-structure-editing';

export interface KalimbaKeyView {
  id: string;
  value: string;
  letter: string;
  hand: 'L' | 'R';
  color: string;
  pitch: Pitch;
}

type InsertMode = 'single' | 'chord';

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
  readonly musicEventRemovalRequested = output<number>();
  readonly musicEventDurationRequested = output<{ eventIndex: number; durationBeats: number }>();
  readonly musicEventAppendRequested = output<{ event: MusicEvent; track: MusicTrackId }>();
  readonly undoRequested = output<void>();
  readonly redoRequested = output<void>();

  readonly insertMode = signal<InsertMode>('single');
  readonly activeTrack = signal<MusicTrackId>('melody');
  readonly trackOptions = ['melody', 'accompaniment'] as const;
  readonly chordDraft = signal<Pitch[]>([]);
  readonly notice = signal<string | null>(null);
  readonly moreActionsOpen = signal(false);
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
    });
  }

  events(): MusicEvent[] {
    return [...(this.structuredEvents() ?? decodeLegacyNotation(this.notationControl().value).events)];
  }

  eventCountLabel(): string {
    const count = this.events().length;
    return `${count} ${count === 1 ? 'Ereignis' : 'Ereignisse'}`;
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
    this.insertMode.set(mode);
    this.chordDraft.set([]);
    this.notice.set(null);
  }

  setActiveTrack(track: MusicTrackId): void {
    this.activeTrack.set(track);
    this.chordDraft.set([]);
    this.notice.set(null);
  }

  handleKey(key: KalimbaKeyView): void {
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

  insertSeparator(): void {
    this.append({ kind: 'separator' });
  }

  removeEvent(index: number): void {
    this.musicEventRemovalRequested.emit(index);
  }

  setEventDuration(eventIndex: number, duration: string): void {
    this.musicEventDurationRequested.emit({ eventIndex, durationBeats: Number(duration) });
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
      this.chordDraft().map((pitch) => this.pitchLabel(pitch)).join(' + ') ||
      'Noch keine Töne gewählt'
    );
  }

  eventsForTrack(track: MusicTrackId): { event: MusicEvent; index: number }[] {
    return this.events().flatMap((event, index) =>
      musicEventTrack(event) === track ? [{ event, index }] : [],
    );
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
