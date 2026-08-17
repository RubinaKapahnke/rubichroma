import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { encodeLegacyNotation } from '../../domain/legacy-notation-codec';
import { projectSongWordEvents, SongDocument } from '../../domain/song-document';

export type WordForm = FormGroup<{
  text: FormControl<string>;
  notation: FormControl<string>;
}>;

export type LineForm = FormGroup<{ words: FormArray<WordForm> }>;

export interface WordSelection {
  lineIndex: number;
  wordIndex: number;
}

export function createSongLinesForm(document: SongDocument): FormArray<LineForm> {
  return new FormArray(
    document.song.lines.map(
      (line) =>
        new FormGroup({
          words: new FormArray(
            line.words.map(
              (word) =>
                new FormGroup({
                  text: new FormControl(word.text, { nonNullable: true }),
                  notation: new FormControl(
                    encodeLegacyNotation(projectSongWordEvents(word), word.legacyNotation),
                    { nonNullable: true },
                  ),
                }),
            ),
          ),
        }),
    ),
  );
}
