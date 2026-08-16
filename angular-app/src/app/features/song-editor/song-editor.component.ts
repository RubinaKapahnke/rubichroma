import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { debounceTime, Subscription } from 'rxjs';
import { decodeLegacyNotation, encodeLegacyNotation } from '../../domain/legacy-notation-codec';
import { SongDocument } from '../../domain/song-document';
import { ThemeService } from '../../infrastructure/theme.service';
import { LineForm, WordForm, WordSelection } from './song-editor-form';
import { EditorValue, SongEditorStore } from './song-editor.store';
import { SongSheetComponent } from './song-sheet.component';
import { KalimbaKeyView, WordEditorComponent } from './word-editor.component';

@Component({
  selector: 'app-song-editor',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
    SongSheetComponent,
    WordEditorComponent,
  ],
  templateUrl: './song-editor.component.html',
  styleUrl: './song-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongEditorComponent {
  readonly store = inject(SongEditorStore);
  readonly theme = inject(ThemeService);
  readonly title = new FormControl('', { nonNullable: true });
  readonly lines = new FormArray<LineForm>([]);
  readonly selection = signal<WordSelection | null>(null);
  readonly kalimbaKeys = computed(() => {
    const keys = this.store.document()?.keys ?? [];
    return keys.flatMap((key, index): KalimbaKeyView[] => {
      const value = key['value'];
      if (typeof value !== 'string') return [];
      const event = decodeLegacyNotation(value).events[0];
      if (!event || event.kind !== 'note') return [];
      return [
        {
          id: `${index}-${event.pitch.degree}-${event.pitch.octave}`,
          value,
          letter: typeof key['letter'] === 'string' ? key['letter'] : value,
          hand: key['hand'] === 'R' ? 'R' : 'L',
          color: typeof key['color'] === 'string' ? key['color'] : '#ece8f0',
          pitch: event.pitch,
        },
      ];
    });
  });
  private readonly destroyRef = inject(DestroyRef);
  private formSubscription?: Subscription;
  private hydratedVersion = 0;

  constructor() {
    effect(() => {
      const version = this.store.hydrationVersion();
      const document = this.store.document();
      if (document && version > this.hydratedVersion) {
        this.hydratedVersion = version;
        this.hydrate(document);
      }
    });
    void this.store.initialize();
    this.destroyRef.onDestroy(() => this.formSubscription?.unsubscribe());
  }

  async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      await this.store.importJson(await file.text());
    } catch (error) {
      this.store.setError(error);
    } finally {
      input.value = '';
    }
  }

  exportFile(): void {
    try {
      const blob = new Blob([this.store.exportJson()], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'kalimba-song.json';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.store.setError(error);
    }
  }

  changeTheme(event: Event): void {
    this.theme.setPreference((event.target as HTMLSelectElement).value);
  }

  changeSelection(selection: WordSelection | null): void {
    this.selection.set(selection);
  }

  closeWordEditor(): void {
    this.selection.set(null);
  }

  selectedWord(): WordForm | null {
    const selection = this.selection();
    return selection
      ? (this.lines.at(selection.lineIndex)?.controls.words.at(selection.wordIndex) ?? null)
      : null;
  }

  selectionLocation(): string {
    const selection = this.selection();
    return selection ? `Zeile ${selection.lineIndex + 1} · Block ${selection.wordIndex + 1}` : '';
  }

  selectionTestId(): string {
    const selection = this.selection();
    return selection ? `${selection.lineIndex}-${selection.wordIndex}` : '';
  }

  private hydrate(document: SongDocument): void {
    this.formSubscription?.unsubscribe();
    this.selection.set(null);
    this.title.setValue(document.song.title, { emitEvent: false });
    this.lines.clear({ emitEvent: false });
    for (const line of document.song.lines) {
      this.lines.push(
        new FormGroup({
          words: new FormArray(
            line.words.map(
              (word) =>
                new FormGroup({
                  text: new FormControl(word.text, { nonNullable: true }),
                  notation: new FormControl(
                    encodeLegacyNotation(word.events, word.legacyNotation),
                    { nonNullable: true },
                  ),
                }),
            ),
          ),
        }),
        { emitEvent: false },
      );
    }

    this.formSubscription = new Subscription();
    this.formSubscription.add(
      this.title.valueChanges.subscribe(() => this.store.updateEditorValue(this.editorValue())),
    );
    this.formSubscription.add(
      this.lines.valueChanges.subscribe(() => this.store.updateEditorValue(this.editorValue())),
    );
    this.formSubscription.add(
      this.title.valueChanges.pipe(debounceTime(350)).subscribe(() => void this.persist()),
    );
    this.formSubscription.add(
      this.lines.valueChanges.pipe(debounceTime(350)).subscribe(() => void this.persist()),
    );
  }

  private persist(): Promise<void> {
    return this.store.saveEditorValue(this.editorValue());
  }

  private editorValue(): EditorValue {
    return {
      title: this.title.value,
      lines: this.lines.controls.map((line) => ({
        words: line.controls.words.controls.map((word) => ({
          text: word.controls.text.value,
          notation: word.controls.notation.value,
        })),
      })),
    };
  }
}
