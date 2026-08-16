import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormArray } from '@angular/forms';
import { decodeLegacyNotation } from '../../domain/legacy-notation-codec';
import { MusicEvent } from '../../domain/music-event';
import { LineForm, WordForm, WordSelection } from './song-editor-form';

@Component({
  selector: 'app-song-sheet',
  templateUrl: './song-sheet.component.html',
  styleUrl: './song-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongSheetComponent {
  readonly lines = input.required<FormArray<LineForm>>();
  readonly selection = input.required<WordSelection | null>();
  readonly selectionChange = output<WordSelection | null>();

  selectWord(lineIndex: number, wordIndex: number): void {
    this.selectionChange.emit({ lineIndex, wordIndex });
  }

  isSelected(lineIndex: number, wordIndex: number): boolean {
    const selection = this.selection();
    return selection?.lineIndex === lineIndex && selection.wordIndex === wordIndex;
  }

  wordLabel(word: WordForm): string {
    return word.controls.text.value.trim() || '♪ Melodie';
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
}

function formatPitch(degree: number, octave: number): string {
  return `${degree}${octave === 0 ? '' : octave === 1 ? '′' : '″'}`;
}
