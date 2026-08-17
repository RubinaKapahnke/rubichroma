import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { decodeLegacyNotation } from '../../domain/legacy-notation-codec';
import { appendMusicEvent, removeMusicEvent } from '../../domain/music-event-editing';
import { MusicEvent, Pitch } from '../../domain/music-event';
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
  readonly location = input.required<string>();
  readonly testIdSuffix = input.required<string>();
  readonly keys = input.required<readonly KalimbaKeyView[]>();
  readonly canDeleteBlock = input.required<boolean>();
  readonly canCopyToNextLine = input.required<boolean>();
  readonly canUndo = input.required<boolean>();
  readonly canRedo = input.required<boolean>();
  readonly closed = output<void>();
  readonly structureAction = output<SongStructureAction>();
  readonly undoRequested = output<void>();
  readonly redoRequested = output<void>();

  readonly insertMode = signal<InsertMode>('single');
  readonly chordDraft = signal<Pitch[]>([]);
  readonly notice = signal<string | null>(null);

  events(): MusicEvent[] {
    return decodeLegacyNotation(this.notationControl().value).events;
  }

  hasUnknownFragments(): boolean {
    return decodeLegacyNotation(this.notationControl().value).hasUnknownFragments;
  }

  setInsertMode(mode: InsertMode): void {
    this.insertMode.set(mode);
    this.chordDraft.set([]);
    this.notice.set(null);
  }

  handleKey(key: KalimbaKeyView): void {
    if (this.insertMode() === 'single') {
      this.append({ kind: 'note', pitch: key.pitch, duration: 'quarter' });
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
    this.append({ kind: 'chord', pitches, duration: 'quarter' });
    this.chordDraft.set([]);
  }

  insertSeparator(): void {
    this.append({ kind: 'separator' });
  }

  removeEvent(index: number): void {
    this.applyEdit(removeMusicEvent(this.notationControl().value, index));
  }

  isPitchUsed(pitch: Pitch): boolean {
    return this.events().some((event) => {
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
        return formatPitch(event.pitch);
      case 'chord':
        return event.pitches.map(formatPitch).join(' + ');
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

  draftLabel(): string {
    return this.chordDraft().map(formatPitch).join(' + ') || 'Noch keine Töne gewählt';
  }

  private append(event: MusicEvent): void {
    this.applyEdit(appendMusicEvent(this.notationControl().value, event));
  }

  private applyEdit(result: ReturnType<typeof appendMusicEvent>): void {
    if (!result.ok) {
      this.notice.set(
        'Diese Notation enthält unbekannte Legacy-Fragmente. Bearbeite sie zuerst im Textfeld, damit nichts verloren geht.',
      );
      return;
    }

    this.notationControl().setValue(result.notation);
    this.notice.set(null);
  }
}

function samePitch(left: Pitch, right: Pitch): boolean {
  return left.degree === right.degree && left.octave === right.octave;
}

function formatPitch(pitch: Pitch): string {
  return `${pitch.degree}${pitch.octave === 0 ? '' : pitch.octave === 1 ? '′' : '″'}`;
}
