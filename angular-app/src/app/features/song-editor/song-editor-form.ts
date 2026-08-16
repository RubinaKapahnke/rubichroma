import { FormArray, FormControl, FormGroup } from '@angular/forms';

export type WordForm = FormGroup<{
  text: FormControl<string>;
  notation: FormControl<string>;
}>;

export type LineForm = FormGroup<{ words: FormArray<WordForm> }>;

export interface WordSelection {
  lineIndex: number;
  wordIndex: number;
}
