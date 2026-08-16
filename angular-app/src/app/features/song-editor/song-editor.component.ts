import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { debounceTime, Subscription } from 'rxjs';
import { decodeLegacyNotation, encodeLegacyNotation } from '../../domain/legacy-notation-codec';
import { SongDocument } from '../../domain/song-document';
import { EditorValue, SongEditorStore } from './song-editor.store';

type WordForm = FormGroup<{
  text: FormControl<string>;
  notation: FormControl<string>;
}>;
type LineForm = FormGroup<{ words: FormArray<WordForm> }>;

@Component({
  selector: 'app-song-editor',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
  ],
  templateUrl: './song-editor.component.html',
  styleUrl: './song-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongEditorComponent {
  readonly store = inject(SongEditorStore);
  readonly title = new FormControl('', { nonNullable: true });
  readonly lines = new FormArray<LineForm>([]);
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

  projectionSummary(notation: string): string {
    const decoded = decodeLegacyNotation(notation);
    const eventCount = decoded.events.length;
    return `${eventCount} Musikereignis${eventCount === 1 ? '' : 'se'}${
      decoded.hasUnknownFragments ? ' · unbekannte Fragmente bleiben beim Speichern erhalten' : ''
    }`;
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

  trackByIndex(index: number): number {
    return index;
  }

  private hydrate(document: SongDocument): void {
    this.formSubscription?.unsubscribe();
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
