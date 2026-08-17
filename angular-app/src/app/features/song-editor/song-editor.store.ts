import { computed, inject, Injectable, signal } from '@angular/core';
import { DEFAULT_DOCUMENT } from '../../domain/default-document';
import {
  encodeLegacyNotation,
  replaceWithLegacyNotation,
} from '../../domain/legacy-notation-codec';
import { cloneDocument, SongDocument } from '../../domain/song-document';
import {
  MusicSelectionClipboard,
  MusicSelectionPasteResult,
  pasteMusicSelection,
} from '../../domain/song-selection-editing';
import {
  editSongStructure,
  SongPosition,
  SongStructureAction,
  SongStructureEditResult,
  SongStructureHistory,
} from '../../domain/song-structure-editing';
import {
  LEGACY_STORAGE_KEY,
  parseLegacyV0,
  stringifyVanillaCompatible,
} from '../../infrastructure/legacy/legacy-v0.adapter';
import { BrowserSongRepository } from '../../infrastructure/persistence/song.repository';

export interface EditorValue {
  title: string;
  lines: { words: { text: string; notation: string }[] }[];
}

export type SaveStatus = 'loading' | 'saved' | 'saving' | 'error';

@Injectable({ providedIn: 'root' })
export class SongEditorStore {
  private readonly repository = inject(BrowserSongRepository);
  private readonly documentState = signal<SongDocument | null>(null);
  private readonly statusState = signal<SaveStatus>('loading');
  private readonly errorState = signal<string | null>(null);
  private readonly hydrationVersionState = signal(0);
  private readonly canUndoState = signal(false);
  private readonly structureHistory = new SongStructureHistory();
  private initialization?: Promise<void>;

  readonly document = this.documentState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly hydrationVersion = this.hydrationVersionState.asReadonly();
  readonly canUndo = this.canUndoState.asReadonly();
  readonly hasDocument = computed(() => this.documentState() !== null);

  async initialize(): Promise<void> {
    this.initialization ??= this.loadInitialDocument();
    return this.initialization;
  }

  private async loadInitialDocument(): Promise<void> {
    this.statusState.set('loading');
    this.errorState.set(null);
    try {
      const legacyJson = localStorage.getItem(LEGACY_STORAGE_KEY);
      const document = await this.repository.migrateLegacy(legacyJson, DEFAULT_DOCUMENT);
      this.documentState.set(document);
      this.structureHistory.clear();
      this.canUndoState.set(false);
      this.hydrationVersionState.update((version) => version + 1);
      this.statusState.set('saved');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(messageOf(error));
    }
  }

  applyStructureAction(
    action: SongStructureAction,
    selection: SongPosition,
  ): SongStructureEditResult {
    const current = this.documentState();
    if (!current) return { ok: false, reason: 'invalid-selection' };
    const result = editSongStructure({ document: current, selection }, action);
    if (!result.ok) return result;

    this.structureHistory.record({ document: current, selection });
    this.canUndoState.set(true);
    this.applyStructureSnapshot(result.state.document);
    void this.persistSnapshot(result.state.document);
    return result;
  }

  applyMusicSelectionPaste(
    clipboard: MusicSelectionClipboard,
    targets: readonly SongPosition[],
    selection: SongPosition,
  ): MusicSelectionPasteResult {
    const current = this.documentState();
    if (!current) return { ok: false, reason: 'invalid-target' };
    const result = pasteMusicSelection(current, clipboard, targets);
    if (!result.ok) return result;

    this.structureHistory.record({ document: current, selection });
    this.canUndoState.set(true);
    this.applyStructureSnapshot(result.document);
    void this.persistSnapshot(result.document);
    return result;
  }

  undoStructure(): SongPosition | null {
    const previous = this.structureHistory.undo();
    this.canUndoState.set(this.structureHistory.canUndo);
    if (!previous) return null;
    this.applyStructureSnapshot(previous.document);
    void this.persistSnapshot(previous.document);
    return previous.selection;
  }

  async saveEditorValue(value: EditorValue): Promise<void> {
    const candidate = this.updateEditorValue(value);
    if (!candidate) return;

    try {
      const saved = await this.repository.save(candidate);
      // Do not overwrite a newer in-memory edit when an earlier IndexedDB write finishes later.
      if (this.documentState() === candidate) {
        this.documentState.set(saved);
        this.statusState.set('saved');
      }
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(`Speichern fehlgeschlagen: ${messageOf(error)}`);
    }
  }

  updateEditorValue(value: EditorValue): SongDocument | null {
    const current = this.documentState();
    if (!current) return null;
    const candidate = cloneDocument(current);
    candidate.song.title = value.title;
    value.lines.forEach((line, lineIndex) => {
      line.words.forEach((word, wordIndex) => {
        const target = candidate.song.lines[lineIndex]?.words[wordIndex];
        if (target) {
          target.text = word.text;
          if (word.notation !== encodeLegacyNotation(target.events, target.legacyNotation)) {
            Object.assign(target, replaceWithLegacyNotation(word.notation));
          }
        }
      });
    });

    // A non-structural edit is a newer state that an older structure snapshot must not overwrite.
    this.structureHistory.clear();
    this.canUndoState.set(false);
    this.documentState.set(candidate);
    this.statusState.set('saving');
    this.errorState.set(null);
    return candidate;
  }

  async importJson(json: string): Promise<void> {
    // Validation completes before the transaction, so invalid input cannot mutate the DB or signal state.
    const candidate = parseLegacyV0(json);
    this.statusState.set('saving');
    this.errorState.set(null);
    try {
      const saved = await this.repository.replace(candidate);
      this.documentState.set(saved);
      this.structureHistory.clear();
      this.canUndoState.set(false);
      this.hydrationVersionState.update((version) => version + 1);
      this.statusState.set('saved');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(`Import fehlgeschlagen: ${messageOf(error)}`);
      throw error;
    }
  }

  exportJson(): string {
    const current = this.documentState();
    if (!current) throw new Error('Noch kein Song geladen.');
    return stringifyVanillaCompatible(current);
  }

  setError(error: unknown): void {
    this.statusState.set('error');
    this.errorState.set(messageOf(error));
  }

  private applyStructureSnapshot(document: SongDocument): void {
    this.documentState.set(document);
    this.hydrationVersionState.update((version) => version + 1);
    this.statusState.set('saving');
    this.errorState.set(null);
  }

  private async persistSnapshot(snapshot: SongDocument): Promise<void> {
    try {
      const saved = await this.repository.save(snapshot);
      // A late save must never replace a newer edit or undo snapshot in memory.
      if (this.documentState() === snapshot) {
        this.documentState.set(saved);
        this.statusState.set('saved');
      }
    } catch (error) {
      if (this.documentState() === snapshot) {
        this.statusState.set('error');
        this.errorState.set(`Speichern fehlgeschlagen: ${messageOf(error)}`);
      }
    }
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Unbekannter Fehler';
}
