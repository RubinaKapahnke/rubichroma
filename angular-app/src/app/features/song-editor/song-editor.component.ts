import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { debounceTime, Subscription } from 'rxjs';
import { decodeLegacyNotation } from '../../domain/legacy-notation-codec';
import { SongDocument } from '../../domain/song-document';
import {
  createMusicSelectionClipboard,
  EMPTY_SONG_SELECTION,
  MusicSelectionClipboard,
  normalizeSongSelection,
  SongSelectionMode,
  SongSelectionState,
  updateSongSelection,
} from '../../domain/song-selection-editing';
import { SongPosition, SongStructureAction } from '../../domain/song-structure-editing';
import { ThemeService } from '../../infrastructure/theme.service';
import { createSongLinesForm, LineForm, WordForm, WordSelection } from './song-editor-form';
import { EditorValue, SongEditorStore } from './song-editor.store';
import { SongSheetComponent, WordSelectionGesture } from './song-sheet.component';
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
  readonly lines = signal<FormArray<LineForm>>(new FormArray<LineForm>([]));
  readonly selectionState = signal<SongSelectionState>({
    ...EMPTY_SONG_SELECTION,
    positions: [],
  });
  readonly selection = computed(() => this.selectionState().active);
  readonly selectedPositions = computed(() => this.selectionState().positions);
  readonly touchSelectionActive = signal(false);
  readonly musicClipboard = signal<MusicSelectionClipboard | null>(null);
  readonly clipboardCount = computed(() => this.musicClipboard()?.sequences.length ?? 0);
  readonly actionNotice = signal<string | null>(null);
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
      this.clearSelection();
      this.musicClipboard.set(null);
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
    if (!selection) {
      this.clearSelection();
      return;
    }
    this.touchSelectionActive.set(false);
    this.setSingleSelection(selection);
  }

  handleWordSelection(gesture: WordSelectionGesture): void {
    const document = this.store.document();
    if (!document) return;
    this.touchSelectionActive.set(gesture.touchSelection);
    const mode: SongSelectionMode = gesture.shiftKey
      ? 'range'
      : gesture.toggleKey
        ? 'toggle'
        : 'single';
    const selectionState = updateSongSelection(
      document,
      this.selectionState(),
      gesture.position,
      mode,
    );
    this.selectionState.set(selectionState);
    if (selectionState.positions.length === 0) this.touchSelectionActive.set(false);
  }

  closeWordEditor(): void {
    this.clearSelection();
  }

  copyMusicSelection(): void {
    const document = this.store.document();
    const active = this.selection();
    if (!document || !active) return;
    const clipboard = createMusicSelectionClipboard(document, this.selectedPositions());
    if (!clipboard) {
      this.actionNotice.set('Die Auswahl konnte nicht kopiert werden.');
      return;
    }
    this.musicClipboard.set(clipboard);
    this.actionNotice.set(
      `${clipboard.sequences.length} ${clipboard.sequences.length === 1 ? 'Block' : 'Blöcke'} mit Noten/Akkorden kopiert`,
    );
    this.focusSelection(active);
  }

  pasteMusicSelection(): void {
    const clipboard = this.musicClipboard();
    const active = this.selection();
    if (!clipboard || !active) return;
    const result = this.store.applyMusicSelectionPaste(clipboard, this.selectedPositions(), active);
    if (!result.ok) {
      this.actionNotice.set(selectionPasteFailureMessage(result.reason));
      this.focusSelection(active);
      return;
    }

    this.selectionState.set(normalizeSongSelection(result.document, this.selectionState()));
    this.actionNotice.set(result.message);
    this.focusSelection(active);
  }

  canPasteMusicSelection(): boolean {
    return this.clipboardCount() > 0 && this.clipboardCount() === this.selectedPositions().length;
  }

  selectionCountLabel(): string {
    const count = this.selectedPositions().length;
    return `${count} ${count === 1 ? 'Block ausgewählt' : 'Blöcke ausgewählt'}`;
  }

  applyStructureAction(action: SongStructureAction): void {
    const selection = this.selectionFor(action);
    if (!selection) return;
    const result = this.store.applyStructureAction(action, selection);
    if (!result.ok) {
      this.actionNotice.set(structureFailureMessage(result.reason));
      return;
    }

    this.setSingleSelection(result.state.selection, result.state.document);
    this.actionNotice.set(result.message);
    this.focusSelection(result.state.selection);
  }

  undoStructure(): void {
    const previousSelectionState = this.selectionState();
    const selection = this.store.undoStructure();
    if (!selection) return;
    const document = this.store.document();
    if (
      document &&
      previousSelectionState.positions.length > 1 &&
      previousSelectionState.positions.some(
        (position) =>
          position.lineIndex === selection.lineIndex && position.wordIndex === selection.wordIndex,
      )
    ) {
      this.selectionState.set(
        normalizeSongSelection(document, { ...previousSelectionState, active: selection }),
      );
    } else {
      this.setSingleSelection(selection, document ?? undefined);
    }
    this.actionNotice.set('Letzte Strukturaktion rückgängig gemacht');
    this.focusSelection(selection);
  }

  canDeleteSelectedBlock(): boolean {
    const selection = this.selection();
    return !!selection && (this.lines().at(selection.lineIndex)?.controls.words.length ?? 0) > 1;
  }

  canCopySelectedBlockToNextLine(): boolean {
    const selection = this.selection();
    return (
      !!selection && (this.lines().at(selection.lineIndex + 1)?.controls.words.length ?? 0) > 0
    );
  }

  selectedWord(): WordForm | null {
    if (this.touchSelectionActive()) return null;
    const selection = this.selection();
    return selection
      ? (this.lines().at(selection.lineIndex)?.controls.words.at(selection.wordIndex) ?? null)
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
    const previousSelectionState = this.selectionState();
    this.title.setValue(document.song.title, { emitEvent: false });
    const lines = createSongLinesForm(document);
    this.lines.set(lines);

    this.selectionState.set(normalizeSongSelection(document, previousSelectionState));

    this.formSubscription = new Subscription();
    this.formSubscription.add(
      this.title.valueChanges.subscribe(() => this.store.updateEditorValue(this.editorValue())),
    );
    this.formSubscription.add(
      lines.valueChanges.subscribe(() => this.store.updateEditorValue(this.editorValue())),
    );
    this.formSubscription.add(
      this.title.valueChanges.pipe(debounceTime(350)).subscribe(() => void this.persist()),
    );
    this.formSubscription.add(
      lines.valueChanges.pipe(debounceTime(350)).subscribe(() => void this.persist()),
    );
  }

  private persist(): Promise<void> {
    return this.store.saveEditorValue(this.editorValue());
  }

  private editorValue(): EditorValue {
    return {
      title: this.title.value,
      lines: this.lines().controls.map((line) => ({
        words: line.controls.words.controls.map((word) => ({
          text: word.controls.text.value,
          notation: word.controls.notation.value,
        })),
      })),
    };
  }

  private selectionFor(action: SongStructureAction): SongPosition | null {
    const current = this.selection();
    if (current) return current;
    if ('lineIndex' in action && this.lines().at(action.lineIndex)?.controls.words.length) {
      return { lineIndex: action.lineIndex, wordIndex: 0 };
    }
    return null;
  }

  private focusSelection(selection: SongPosition): void {
    setTimeout(() => {
      document
        .querySelector<HTMLElement>(
          `[data-testid="word-card-${selection.lineIndex}-${selection.wordIndex}"]`,
        )
        ?.focus();
    });
  }

  private setSingleSelection(selection: SongPosition, document = this.store.document()): void {
    if (!document) return;
    this.selectionState.set(
      updateSongSelection(document, EMPTY_SONG_SELECTION, selection, 'single'),
    );
  }

  private clearSelection(): void {
    this.touchSelectionActive.set(false);
    this.selectionState.set({ ...EMPTY_SONG_SELECTION, positions: [] });
  }
}

function structureFailureMessage(reason: string): string {
  switch (reason) {
    case 'last-block':
      return 'Eine Liedzeile muss mindestens einen Block behalten.';
    case 'last-line':
      return 'Der Song muss mindestens eine Liedzeile behalten.';
    case 'missing-next-line':
    case 'missing-target-block':
      return 'Es gibt keinen passenden Zielblock in der nächsten Zeile.';
    case 'target-has-unknown-legacy-fragments':
      return 'Der Zielblock enthält unbekannte Legacy-Fragmente und wurde deshalb nicht verändert.';
    default:
      return 'Die Strukturaktion konnte nicht ausgeführt werden.';
  }
}

function selectionPasteFailureMessage(reason: string): string {
  switch (reason) {
    case 'selection-count-mismatch':
      return 'Wähle genauso viele Zielblöcke wie zuvor kopierte Quellblöcke.';
    case 'target-has-unknown-legacy-fragments':
      return 'Mindestens ein Zielblock enthält unbekannte Legacy-Fragmente und wurde nicht verändert.';
    case 'empty-clipboard':
      return 'Kopiere zuerst Noten/Akkorde aus einer Auswahl.';
    default:
      return 'Die Noten/Akkorde konnten nicht eingefügt werden.';
  }
}
