import { TestBed } from '@angular/core/testing';
import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COMPLETE_LEGACY } from '../../../testing/fixtures/legacy-v0.fixtures';
import { createMusicSelectionClipboard } from '../../domain/song-selection-editing';
import { LEGACY_STORAGE_KEY } from '../../infrastructure/legacy/legacy-v0.adapter';
import { KalimbaDatabase } from '../../infrastructure/persistence/kalimba.database';
import {
  BrowserSongRepository,
  SongRepository,
} from '../../infrastructure/persistence/song.repository';
import { SongEditorStore } from './song-editor.store';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

describe('SongEditorStore structure persistence', () => {
  let database: KalimbaDatabase;
  let repository: SongRepository;
  let store: SongEditorStore;

  beforeEach(() => {
    localStorage.clear();
    database = new KalimbaDatabase(`store-${crypto.randomUUID()}`);
    repository = new SongRepository(database);
    TestBed.configureTestingModule({
      providers: [SongEditorStore, { provide: BrowserSongRepository, useValue: repository }],
    });
    store = TestBed.inject(SongEditorStore);
  });

  afterEach(async () => {
    TestBed.resetTestingModule();
    await database.delete();
    localStorage.clear();
  });

  it('autosaves structural snapshots, reloads them and never mutates the legacy source', async () => {
    const legacyJson = JSON.stringify(COMPLETE_LEGACY);
    localStorage.setItem(LEGACY_STORAGE_KEY, legacyJson);
    await store.initialize();

    const duplicate = store.applyStructureAction(
      { kind: 'duplicate-block' },
      { lineIndex: 0, wordIndex: 0 },
    );
    expect(duplicate.ok).toBe(true);
    expect(store.status()).toBe('saving');
    await expectSaved(store);

    const persisted = await repository.load();
    expect(persisted?.song.lines[0].words).toHaveLength(5);
    expect(persisted?.song.lines[0].words[1]).toEqual(persisted?.song.lines[0].words[0]);
    expect(persisted?.song.lines[0].words[1].extra['wordTag']).toEqual(['x', 2]);
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe(legacyJson);

    const reloaded = await repository.migrateLegacy(legacyJson, persisted!);
    expect(reloaded).toEqual(persisted);
  });

  it('undoes multiple structure actions in reverse order and persists the final snapshot', async () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(COMPLETE_LEGACY));
    await store.initialize();
    const original = structuredClone(store.document()!);

    expect(
      store.applyStructureAction({ kind: 'duplicate-block' }, { lineIndex: 0, wordIndex: 0 }).ok,
    ).toBe(true);
    expect(
      store.applyStructureAction(
        { kind: 'duplicate-line', lineIndex: 0 },
        { lineIndex: 0, wordIndex: 1 },
      ).ok,
    ).toBe(true);
    expect(store.canUndo()).toBe(true);
    expect(store.document()?.song.lines).toHaveLength(2);

    expect(store.undoStructure()).toEqual({ lineIndex: 0, wordIndex: 1 });
    expect(store.document()?.song.lines).toHaveLength(1);
    expect(store.undoStructure()).toEqual({ lineIndex: 0, wordIndex: 0 });
    expect(store.document()).toEqual(original);
    expect(store.canUndo()).toBe(false);
    expect(store.undoStructure()).toBeNull();

    await expectSaved(store);
    expect(await repository.load()).toEqual(original);
  });

  it('does not let an older structure snapshot overwrite a newer editor state', async () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(COMPLETE_LEGACY));
    await store.initialize();
    expect(
      store.applyStructureAction({ kind: 'duplicate-block' }, { lineIndex: 0, wordIndex: 0 }).ok,
    ).toBe(true);

    const document = store.document()!;
    await store.saveEditorValue({
      title: 'Neuerer Titel',
      lines: document.song.lines.map((line) => ({
        words: line.words.map((word) => ({
          text: word.text,
          notation: word.legacyNotation.raw,
        })),
      })),
    });

    expect(store.canUndo()).toBe(false);
    expect(store.undoStructure()).toBeNull();
    expect(store.document()?.song.title).toBe('Neuerer Titel');
    await expectSaved(store);
  });

  it('persists a multi-selection paste and restores the exact previous snapshot with undo', async () => {
    await store.initialize();
    const original = structuredClone(store.document()!);
    const clipboard = createMusicSelectionClipboard(original, [{ lineIndex: 0, wordIndex: 0 }])!;

    const result = store.applyMusicSelectionPaste(clipboard, [{ lineIndex: 0, wordIndex: 1 }], {
      lineIndex: 0,
      wordIndex: 1,
    });
    expect(result.ok).toBe(true);
    expect(store.canUndo()).toBe(true);
    expect(store.document()?.song.lines[0].words[1].text).toBe('♪');
    expect(store.document()?.song.lines[0].words[1].events.map((event) => event.kind)).toEqual([
      'note',
      'separator',
      'note',
      'note',
      'chord',
    ]);
    await expectSaved(store);
    expect(await repository.load()).toEqual(store.document());

    expect(store.undoStructure()).toEqual({ lineIndex: 0, wordIndex: 1 });
    expect(store.document()).toEqual(original);
    await expectSaved(store);
    expect(await repository.load()).toEqual(original);
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });
});

async function expectSaved(store: SongEditorStore): Promise<void> {
  await expect.poll(() => store.status(), { timeout: 2_000 }).toBe('saved');
}
