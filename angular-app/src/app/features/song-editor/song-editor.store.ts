import { computed, inject, Injectable, signal } from '@angular/core';
import { DEFAULT_DOCUMENT } from '../../domain/default-document';
import { cloneDocument, SongDocument } from '../../domain/song-document';
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

  readonly document = this.documentState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly hydrationVersion = this.hydrationVersionState.asReadonly();
  readonly hasDocument = computed(() => this.documentState() !== null);

  async initialize(): Promise<void> {
    this.statusState.set('loading');
    this.errorState.set(null);
    try {
      const legacyJson = localStorage.getItem(LEGACY_STORAGE_KEY);
      const document = await this.repository.migrateLegacy(legacyJson, DEFAULT_DOCUMENT);
      this.documentState.set(document);
      this.hydrationVersionState.update((version) => version + 1);
      this.statusState.set('saved');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(messageOf(error));
    }
  }

  async saveEditorValue(value: EditorValue): Promise<void> {
    const current = this.documentState();
    if (!current) return;
    const candidate = cloneDocument(current);
    candidate.song.title = value.title;
    value.lines.forEach((line, lineIndex) => {
      line.words.forEach((word, wordIndex) => {
        const target = candidate.song.lines[lineIndex]?.words[wordIndex];
        if (target) {
          target.text = word.text;
          target.notation = word.notation;
        }
      });
    });

    this.statusState.set('saving');
    this.errorState.set(null);
    try {
      const saved = await this.repository.save(candidate);
      this.documentState.set(saved);
      this.statusState.set('saved');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(`Speichern fehlgeschlagen: ${messageOf(error)}`);
    }
  }

  async importJson(json: string): Promise<void> {
    // Validation completes before the transaction, so invalid input cannot mutate the DB or signal state.
    const candidate = parseLegacyV0(json);
    this.statusState.set('saving');
    this.errorState.set(null);
    try {
      const saved = await this.repository.replace(candidate);
      this.documentState.set(saved);
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
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Unbekannter Fehler';
}
