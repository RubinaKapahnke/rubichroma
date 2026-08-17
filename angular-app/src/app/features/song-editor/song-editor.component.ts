import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';
import { FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router } from '@angular/router';
import { debounceTime, Subscription } from 'rxjs';
import { decodeLegacyNotation } from '../../domain/legacy-notation-codec';
import { MusicEvent, MusicTrackId, Pitch } from '../../domain/music-event';
import { buildPlayerTimeline } from '../../domain/player-timeline';
import { projectSongWordEvents, SongDocument } from '../../domain/song-document';
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
import type { LocalBackupPreview } from '../../infrastructure/persistence/local-backup';
import { AudioPreviewService } from '../player/audio-preview.service';
import { PlayerLaunchService } from '../player/player-launch.service';
import { createSongLinesForm, LineForm, WordForm, WordSelection } from './song-editor-form';
import { EditorValue, SongEditorStore } from './song-editor.store';
import { SongSheetComponent, WordSelectionGesture } from './song-sheet.component';
import { KalimbaKeyView, WordEditorComponent } from './word-editor.component';

export type EditorInteractionMode = 'idle' | 'editing' | 'multi-select';
export type EditorDocumentMode = 'view' | 'edit';

@Component({
  selector: 'app-song-editor',
  imports: [
    A11yModule,
    NgTemplateOutlet,
    OverlayModule,
    PortalModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
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
  private readonly router = inject(Router);
  private readonly playerLaunch = inject(PlayerLaunchService);
  private readonly audioPreview = inject(AudioPreviewService);
  readonly title = new FormControl('', { nonNullable: true });
  readonly lines = signal<FormArray<LineForm>>(new FormArray<LineForm>([]));
  readonly selectionState = signal<SongSelectionState>({
    ...EMPTY_SONG_SELECTION,
    positions: [],
  });
  readonly selection = computed(() => this.selectionState().active);
  readonly selectedPositions = computed(() => this.selectionState().positions);
  readonly melodyPositions = computed<readonly WordSelection[]>(() => {
    const document = this.store.document();
    if (!document) return [];
    return document.song.lines.flatMap((line, lineIndex) =>
      line.words.flatMap((word, wordIndex) =>
        word.toneCount === undefined ? [] : [{ lineIndex, wordIndex }],
      ),
    );
  });
  readonly interactionMode = signal<EditorInteractionMode>('idle');
  readonly documentMode = signal<EditorDocumentMode>('view');
  readonly editingEnabled = computed(() => this.documentMode() === 'edit');
  readonly touchSelectionActive = computed(() => this.interactionMode() === 'multi-select');
  readonly mobileViewport = signal(false);
  readonly musicClipboard = signal<MusicSelectionClipboard | null>(null);
  readonly clipboardCount = computed(() => this.musicClipboard()?.sequences.length ?? 0);
  readonly actionNotice = signal<string | null>(null);
  readonly pendingRestore = signal<LocalBackupPreview | null>(null);
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
  readonly selectedMusicEvents = computed(() => {
    const selection = this.selection();
    if (!selection) return [];
    const word = this.store.document()?.song.lines[selection.lineIndex]?.words[selection.wordIndex];
    return word ? projectSongWordEvents(word) : [];
  });
  private readonly destroyRef = inject(DestroyRef);
  private readonly overlay = inject(Overlay);
  private readonly selectionPortal = viewChild<CdkPortal>('selectionPortal');
  private readonly editorPortal = viewChild<CdkPortal>('editorPortal');
  private formSubscription?: Subscription;
  private hydratedVersion = 0;
  private selectionOverlayRef?: OverlayRef;
  private editorOverlayRef?: OverlayRef;
  private selectionResizeObserver?: ResizeObserver;
  private mobileMediaQuery?: MediaQueryList;
  private readonly updateViewportMetrics = (): void => {
    if (typeof window === 'undefined') return;
    const visualViewport = window.visualViewport;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const layoutHeight = document.documentElement.clientHeight || window.innerHeight;
    const viewportBottom = Math.max(0, layoutHeight - viewportTop - viewportHeight);
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--rc-visual-viewport-height', `${viewportHeight}px`);
    rootStyle.setProperty('--rc-visual-viewport-top', `${viewportTop}px`);
    rootStyle.setProperty('--rc-visual-viewport-bottom', `${viewportBottom}px`);
  };
  private readonly updateMobileViewport = (event?: MediaQueryListEvent): void => {
    this.mobileViewport.set(event?.matches ?? this.mobileMediaQuery?.matches ?? false);
  };

  constructor() {
    effect(() => {
      const version = this.store.hydrationVersion();
      const document = this.store.document();
      if (document && version > this.hydratedVersion) {
        this.hydratedVersion = version;
        this.hydrate(document);
        if (this.playerLaunch.consumeEditorReturnFocus()) this.focusEditorTitle();
      }
    });
    void this.store.initialize();
    this.initializeViewportTracking();

    effect(() => {
      const portal = this.selectionPortal();
      if (this.interactionMode() === 'multi-select' && portal) {
        this.openSelectionOverlay(portal);
      } else {
        this.closeSelectionOverlay();
      }
    });

    effect(() => {
      const portal = this.editorPortal();
      if (this.interactionMode() === 'editing' && this.mobileViewport() && portal) {
        this.openEditorOverlay(portal);
      } else {
        this.closeEditorOverlay();
      }
    });

    this.destroyRef.onDestroy(() => {
      this.formSubscription?.unsubscribe();
      this.selectionResizeObserver?.disconnect();
      this.selectionOverlayRef?.dispose();
      this.editorOverlayRef?.dispose();
      this.mobileMediaQuery?.removeEventListener?.('change', this.updateMobileViewport);
      window.visualViewport?.removeEventListener('resize', this.updateViewportMetrics);
      window.visualViewport?.removeEventListener('scroll', this.updateViewportMetrics);
      window.removeEventListener('resize', this.updateViewportMetrics);
      document.documentElement.style.removeProperty('--rc-selection-bar-height');
      this.audioPreview.stop();
    });
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
      this.downloadJson(this.store.exportJson(), 'rubichroma-song.json');
    } catch (error) {
      this.store.setError(error);
    }
  }

  async exportLocalBackupFile(): Promise<void> {
    try {
      await this.persist();
      const date = new Date().toISOString().slice(0, 10);
      this.downloadJson(
        await this.store.exportLocalBackupJson(),
        `rubichroma-sicherung-${date}.json`,
      );
      this.actionNotice.set('Lokale Sicherung erstellt');
    } catch (error) {
      this.store.setError(error);
    }
  }

  async inspectLocalBackupFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const preview = this.store.inspectLocalBackup(await file.text());
      this.pendingRestore.set(preview);
      this.actionNotice.set('Sicherung geprüft – noch nichts verändert');
    } catch (error) {
      this.pendingRestore.set(null);
      this.store.setError(
        new Error(
          `Sicherung konnte nicht geprüft werden: ${
            error instanceof Error ? error.message : 'Unbekannter Fehler'
          }`,
        ),
      );
    } finally {
      input.value = '';
    }
  }

  cancelLocalRestore(): void {
    this.pendingRestore.set(null);
    this.actionNotice.set('Wiederherstellung abgebrochen');
  }

  formatBackupDate(value: string): string {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  async confirmLocalRestore(): Promise<void> {
    const preview = this.pendingRestore();
    if (!preview) return;
    try {
      await this.persist();
      await this.store.restoreLocalBackup(preview);
      this.pendingRestore.set(null);
      this.clearSelection();
      this.actionNotice.set('Lokale Sicherung wiederhergestellt');
      this.focusEditorTitle();
    } catch {
      // The store exposes a user-facing error and leaves the previous document intact on rollback.
    }
  }

  async openPlayer(): Promise<void> {
    this.audioPreview.stop();
    await this.persist();
    this.playerLaunch.prepare(this.store.document(), this.selectedPositions());
    await this.router.navigateByUrl('/player');
  }

  changeTheme(event: Event): void {
    this.theme.setPreference((event.target as HTMLSelectElement).value);
  }

  startEditing(): void {
    this.documentMode.set('edit');
    setTimeout(() =>
      document.querySelector<HTMLInputElement>('[data-testid="song-title"]')?.focus(),
    );
  }

  finishEditing(): void {
    this.clearSelection();
    this.documentMode.set('view');
    setTimeout(() =>
      document.querySelector<HTMLButtonElement>('[data-testid="edit-mode-toggle"]')?.focus(),
    );
  }

  changeSelection(selection: WordSelection | null): void {
    if (!selection) {
      this.clearSelection();
      return;
    }
    if (!this.editingEnabled()) return;
    this.interactionMode.set('editing');
    this.setSingleSelection(selection);
  }

  startMultiSelection(): void {
    if (!this.editingEnabled()) return;
    this.interactionMode.set('multi-select');
  }

  addSongBlock(): void {
    if (!this.editingEnabled()) return;
    const document = this.store.document();
    if (!document || document.song.lines.length === 0) return;
    const lineIndex = document.song.lines.length - 1;
    const line = document.song.lines[lineIndex];
    if (!line?.words.length) return;
    const anchor = { lineIndex, wordIndex: line.words.length - 1 };
    this.interactionMode.set('editing');
    this.setSingleSelection(anchor, document);
    this.applyStructureAction({ kind: 'insert-block', blockKind: 'word' });
  }

  handleWordSelection(gesture: WordSelectionGesture): void {
    if (!this.editingEnabled()) return;
    const document = this.store.document();
    if (!document) return;
    const currentMode = this.interactionMode();
    const startsMultiSelection =
      currentMode === 'multi-select' ||
      gesture.touchSelection ||
      gesture.shiftKey ||
      gesture.toggleKey;
    const mode: SongSelectionMode = startsMultiSelection
      ? gesture.shiftKey && currentMode !== 'multi-select'
        ? 'range'
        : 'toggle'
      : 'single';
    this.interactionMode.set(startsMultiSelection ? 'multi-select' : 'editing');
    const selectionState = updateSongSelection(
      document,
      this.selectionState(),
      gesture.position,
      mode,
    );
    this.selectionState.set(selectionState);
  }

  closeWordEditor(): void {
    const previousSelection = this.selection();
    this.clearSelection();
    if (previousSelection) this.focusSelection(previousSelection);
  }

  dismissInspectorOnBackground(event: MouseEvent): void {
    if (this.interactionMode() !== 'editing') return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (
      target.closest(
        'app-word-editor, .word-card, button, a, input, select, textarea, summary, [role="button"]',
      )
    ) {
      return;
    }
    this.closeWordEditor();
  }

  @HostListener('document:keydown.escape', ['$event'])
  closeDesktopEditorOnEscape(event: Event): void {
    if (this.mobileViewport() || this.interactionMode() !== 'editing') return;
    event.preventDefault();
    this.closeWordEditor();
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

  removeMusicEvent(request: { track: MusicTrackId; eventIndex: number }): void {
    const selection = this.selection();
    if (!selection) return;
    const result = this.store.removeMusicEvent(selection, request.track, request.eventIndex);
    if (!result.ok) {
      this.actionNotice.set(
        result.reason === 'unknown-legacy-fragments'
          ? 'Unbekannte Legacy-Fragmente verhindern das sichere Entfernen dieses Ereignisses.'
          : 'Das Musikereignis konnte nicht entfernt werden.',
      );
      return;
    }

    this.setSingleSelection(result.selection, this.store.document() ?? undefined);
    this.actionNotice.set('Musikereignis entfernt');
    this.focusSelection(result.selection);
  }

  addMusicEvent(request: { event: MusicEvent; track: MusicTrackId }): void {
    const selection = this.selection();
    if (!selection) return;
    const result = this.store.addMusicEvent(selection, request.event, request.track);
    if (!result.ok) {
      this.actionNotice.set(
        result.reason === 'tine-collision'
          ? 'Diese Zunge wird zum selben Anschlag bereits in der anderen Spur gespielt.'
          : result.reason === 'unknown-legacy-fragments'
            ? 'Unbekannte Legacy-Fragmente verhindern das sichere Einfügen.'
            : 'Das Musikereignis konnte nicht eingefügt werden.',
      );
      return;
    }
    this.setSingleSelection(result.selection, this.store.document() ?? undefined);
    this.actionNotice.set(
      request.track === 'melody' ? 'Melodieereignis eingefügt' : 'Begleitereignis eingefügt',
    );
    this.focusSelection(result.selection);
  }

  setMusicEventDuration(request: {
    track: MusicTrackId;
    eventIndex: number;
    durationBeats: number;
  }): void {
    const selection = this.selection();
    if (!selection) return;
    const result = this.store.setMusicEventDuration(
      selection,
      request.track,
      request.eventIndex,
      request.durationBeats,
    );
    if (!result.ok) {
      this.actionNotice.set(
        result.reason === 'unknown-legacy-fragments'
          ? 'Unbekannte Legacy-Fragmente verhindern das sichere Ändern der Dauer.'
          : 'Die Ereignisdauer konnte nicht geändert werden.',
      );
      return;
    }

    this.setSingleSelection(result.selection, this.store.document() ?? undefined);
    this.actionNotice.set('Ereignisdauer geändert');
    this.focusSelection(result.selection);
  }

  previewPitch(pitch: Pitch): void {
    void this.audioPreview.previewPitches([pitch]);
  }

  previewMusicEvent(request: { track: MusicTrackId; eventIndex: number }): void {
    const selection = this.selection();
    const document = this.store.document();
    if (!selection || !document) return;
    const id = `event-${selection.lineIndex}-${selection.wordIndex}-${request.track}-${request.eventIndex}`;
    void this.audioPreview.previewTimeline(
      buildPlayerTimeline(document).events.filter((event) => event.id === id),
    );
  }

  previewBlock(position = this.selection()): void {
    const document = this.store.document();
    if (!position || !document) return;
    void this.audioPreview.previewTimeline(
      buildPlayerTimeline(document).events.filter(
        (event) => event.lineIndex === position.lineIndex && event.wordIndex === position.wordIndex,
      ),
    );
  }

  previewLine(lineIndex: number): void {
    const document = this.store.document();
    if (!document) return;
    void this.audioPreview.previewTimeline(
      buildPlayerTimeline(document).events.filter((event) => event.lineIndex === lineIndex),
    );
  }

  undoStructure(): void {
    const previousSelectionState = this.selectionState();
    const focusTarget = this.historyFocusTarget();
    const selection = this.store.undoStructure();
    if (!selection) return;
    this.restoreHistorySelection(selection, previousSelectionState, focusTarget);
    this.actionNotice.set('Letzte Änderung rückgängig gemacht');
  }

  redoStructure(): void {
    const previousSelectionState = this.selectionState();
    const focusTarget = this.historyFocusTarget();
    const selection = this.store.redoStructure();
    if (!selection) return;
    this.restoreHistorySelection(selection, previousSelectionState, focusTarget);
    this.actionNotice.set('Letzte Änderung wiederholt');
  }

  @HostListener('window:keydown', ['$event'])
  handleHistoryShortcut(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    const redoRequested = key === 'y' || (key === 'z' && event.shiftKey);
    const undoRequested = key === 'z' && !event.shiftKey;
    if (redoRequested && this.store.canRedo()) {
      event.preventDefault();
      this.redoStructure();
    } else if (undoRequested && this.store.canUndo()) {
      event.preventDefault();
      this.undoStructure();
    }
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
    if (!this.editingEnabled() || this.interactionMode() !== 'editing') return null;
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

  selectedWordIsMelody(): boolean {
    const selection = this.selection();
    if (!selection) return false;
    return this.melodyPositions().some(
      (position) =>
        position.lineIndex === selection.lineIndex && position.wordIndex === selection.wordIndex,
    );
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
      this.title.valueChanges.subscribe(() =>
        this.store.updateEditorValue(this.editorValue(), this.historySelection()),
      ),
    );
    this.formSubscription.add(
      lines.valueChanges.subscribe(() =>
        this.store.updateEditorValue(this.editorValue(), this.historySelection()),
      ),
    );
    this.formSubscription.add(
      this.title.valueChanges.pipe(debounceTime(350)).subscribe(() => void this.persist()),
    );
    this.formSubscription.add(
      lines.valueChanges.pipe(debounceTime(350)).subscribe(() => void this.persist()),
    );
  }

  private persist(): Promise<void> {
    return this.store.saveEditorValue(this.editorValue(), this.historySelection());
  }

  private downloadJson(contents: string, filename: string): void {
    const blob = new Blob([contents], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
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
      if (this.mobileViewport() && this.interactionMode() === 'editing') {
        document
          .querySelector<HTMLButtonElement>(
            '.rc-editor-overlay-pane [aria-label="Editor schließen"]',
          )
          ?.focus();
        return;
      }
      document
        .querySelector<HTMLElement>(
          `[data-testid="word-card-${selection.lineIndex}-${selection.wordIndex}"]`,
        )
        ?.focus();
    });
  }

  private focusEditorTitle(): void {
    setTimeout(() =>
      document.querySelector<HTMLInputElement>('[data-testid="song-title"]')?.focus(),
    );
  }

  private setSingleSelection(selection: SongPosition, document = this.store.document()): void {
    if (!document) return;
    this.selectionState.set(
      updateSongSelection(document, EMPTY_SONG_SELECTION, selection, 'single'),
    );
  }

  private restoreHistorySelection(
    selection: SongPosition,
    previousSelectionState: SongSelectionState,
    focusTarget: string | null = null,
  ): void {
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
    if (focusTarget) {
      setTimeout(() => {
        const target = globalThis.document.querySelector<HTMLElement>(
          `[data-testid="${focusTarget}"]`,
        );
        if (target) target.focus();
        else this.focusSelection(selection);
      });
    } else {
      this.focusSelection(selection);
    }
  }

  private historySelection(): SongPosition | null {
    return (
      this.selection() ??
      (this.lines().at(0)?.controls.words.length ? { lineIndex: 0, wordIndex: 0 } : null)
    );
  }

  private historyFocusTarget(): string | null {
    const target = document.activeElement?.getAttribute('data-testid');
    if (target === 'song-title' || /^word-\d+-\d+$/.test(target ?? '')) return target ?? null;
    return null;
  }

  private clearSelection(): void {
    this.audioPreview.stop();
    this.interactionMode.set('idle');
    this.selectionState.set({ ...EMPTY_SONG_SELECTION, positions: [] });
  }

  private initializeViewportTracking(): void {
    if (typeof window === 'undefined') return;
    if (typeof window.matchMedia === 'function') {
      this.mobileMediaQuery = window.matchMedia('(max-width: 760px)');
      this.updateMobileViewport();
      this.mobileMediaQuery.addEventListener?.('change', this.updateMobileViewport);
    }
    window.visualViewport?.addEventListener('resize', this.updateViewportMetrics);
    window.visualViewport?.addEventListener('scroll', this.updateViewportMetrics);
    window.addEventListener('resize', this.updateViewportMetrics);
    this.updateViewportMetrics();
  }

  private openSelectionOverlay(portal: CdkPortal): void {
    if (!this.selectionOverlayRef) {
      this.selectionOverlayRef = this.overlay.create({
        panelClass: 'rc-selection-overlay-pane',
        positionStrategy: this.overlay
          .position()
          .global()
          .left('0')
          .right('0')
          .bottom('var(--rc-visual-viewport-bottom, 0px)'),
        scrollStrategy: this.overlay.scrollStrategies.reposition(),
      });
    }
    if (!this.selectionOverlayRef.hasAttached()) this.selectionOverlayRef.attach(portal);
    queueMicrotask(() => this.observeSelectionToolbar());
  }

  private closeSelectionOverlay(): void {
    this.selectionResizeObserver?.disconnect();
    this.selectionResizeObserver = undefined;
    this.selectionOverlayRef?.detach();
    document.documentElement.style.removeProperty('--rc-selection-bar-height');
  }

  private observeSelectionToolbar(): void {
    const toolbar = document.querySelector<HTMLElement>('[data-testid="selection-toolbar"]');
    if (!toolbar) return;
    const updateHeight = (): void =>
      document.documentElement.style.setProperty(
        '--rc-selection-bar-height',
        `${Math.ceil(toolbar.getBoundingClientRect().height)}px`,
      );
    updateHeight();
    if (typeof ResizeObserver === 'undefined') return;
    this.selectionResizeObserver?.disconnect();
    this.selectionResizeObserver = new ResizeObserver(updateHeight);
    this.selectionResizeObserver.observe(toolbar);
  }

  private openEditorOverlay(portal: CdkPortal): void {
    if (!this.editorOverlayRef) {
      this.editorOverlayRef = this.overlay.create({
        hasBackdrop: true,
        backdropClass: 'rc-editor-overlay-backdrop',
        panelClass: 'rc-editor-overlay-pane',
        positionStrategy: this.overlay
          .position()
          .global()
          .left('0')
          .right('0')
          .bottom('var(--rc-visual-viewport-bottom, 0px)'),
        scrollStrategy: this.overlay.scrollStrategies.block(),
      });
      this.editorOverlayRef.backdropClick().subscribe(() => this.closeWordEditor());
      this.editorOverlayRef.keydownEvents().subscribe((event) => {
        if (event.key === 'Escape') this.closeWordEditor();
      });
    }
    if (!this.editorOverlayRef.hasAttached()) this.editorOverlayRef.attach(portal);
  }

  private closeEditorOverlay(): void {
    this.editorOverlayRef?.detach();
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
    case 'invalid-syllable-split':
      return 'Die gewählte Trennstelle liegt nicht zwischen zwei Buchstaben.';
    case 'insufficient-split-events':
      return 'Beiden Silben muss mindestens ein Musikereignis zugeordnet sein.';
    case 'unsupported-melody-split':
      return 'Melodieblöcke können in diesem Schritt nicht als Silben geteilt werden.';
    case 'source-has-unknown-legacy-fragments':
      return 'Der Block enthält unbekannte Legacy-Fragmente und wurde deshalb nicht verändert.';
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
