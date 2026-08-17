import { Injectable } from '@angular/core';
import { cloneDocument, SongDocument } from '../../domain/song-document';
import { parseLegacyV0 } from '../legacy/legacy-v0.adapter';
import { CURRENT_SONG_META_KEY, KalimbaDatabase, StoredSong } from './kalimba.database';
import type { LocalBackupSnapshot } from './local-backup';
import { canonicalSeedSongs, CANONICAL_CANON_SONG_ID } from './canonical-seed-songs';

const MIGRATION_MARKER = 'legacy-v0-imported';
export { CANONICAL_TWINKLE_SONG_ID } from './canonical-seed-songs';

export type TransactionGuard = () => void | Promise<void>;

export interface SongSummary {
  id: string;
  familyId: string;
  variantName: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  exampleHint?: string;
}

export class SongRepository {
  constructor(
    readonly database: KalimbaDatabase,
    private readonly transactionGuard?: TransactionGuard,
  ) {}

  async migrateLegacy(
    legacyJson: string | null,
    defaultDocument: SongDocument,
  ): Promise<SongDocument> {
    const [existingMarker, currentSongId] = await Promise.all([
      this.database.meta.get(MIGRATION_MARKER),
      this.currentSongId(),
    ]);
    const existingSong = currentSongId ? await this.database.songs.get(currentSongId) : undefined;
    if (existingMarker && !existingSong) {
      throw new Error('Persistenz ist inkonsistent: Migrationsmarker ohne Song.');
    }
    if (existingMarker && existingSong) {
      await this.ensureCanonicalTestSongs();
      return cloneDocument(existingSong.document);
    }
    if (!currentSongId && (await this.database.songs.count()) > 0) {
      throw new Error('Persistenz ist inkonsistent: Liedablage ohne aktuelle Auswahl.');
    }

    // Parse before opening the transaction. An existing but invalid source must not silently become a default.
    const candidate =
      legacyJson === null ? cloneDocument(defaultDocument) : parseLegacyV0(legacyJson);

    return this.database.transaction('rw', this.database.songs, this.database.meta, async () => {
      const [marker, activeMeta] = await Promise.all([
        this.database.meta.get(MIGRATION_MARKER),
        this.database.meta.get(CURRENT_SONG_META_KEY),
      ]);
      const current = activeMeta ? await this.database.songs.get(activeMeta.value) : undefined;
      if (marker && !current)
        throw new Error('Persistenz ist inkonsistent: Migrationsmarker ohne Song.');
      if (current) {
        let changed = false;
        if (!marker) {
          await this.database.meta.put({ key: MIGRATION_MARKER, value: new Date().toISOString() });
          changed = true;
        }
        for (const seed of createCanonicalSeeds()) {
          if (!(await this.database.songs.get(seed.id))) {
            await this.database.songs.add(seed);
            changed = true;
          }
        }
        if (changed) await this.transactionGuard?.();
        return cloneDocument(current.document);
      }

      if (await this.database.songs.count()) {
        throw new Error('Persistenz ist inkonsistent: Liedablage ohne aktuelle Auswahl.');
      }
      const stored = createStored(candidate, createSongId(), 1);
      await this.database.songs.put(stored);
      for (const seed of createCanonicalSeeds()) {
        if (stored.id !== seed.id) await this.database.songs.add(seed);
      }
      await this.transactionGuard?.();
      await this.database.meta.bulkPut([
        { key: MIGRATION_MARKER, value: new Date().toISOString() },
        { key: CURRENT_SONG_META_KEY, value: stored.id },
      ]);
      return cloneDocument(stored.document);
    });
  }

  async ensureCanonicalTestSongs(): Promise<void> {
    const seeds = createCanonicalSeeds();
    await this.database.transaction('rw', this.database.songs, async () => {
      let changed = false;
      for (const seed of seeds) {
        if (!(await this.database.songs.get(seed.id))) {
          await this.database.songs.add(seed);
          changed = true;
        }
      }
      if (changed) await this.transactionGuard?.();
    });
  }

  async currentSongId(): Promise<string | null> {
    return (await this.database.meta.get(CURRENT_SONG_META_KEY))?.value ?? null;
  }

  async load(songId?: string): Promise<SongDocument | null> {
    const resolvedSongId = songId ?? (await this.currentSongId());
    if (!resolvedSongId) return null;
    const current = await this.database.songs.get(resolvedSongId);
    return current ? cloneDocument(current.document) : null;
  }

  async listSongs(): Promise<SongSummary[]> {
    const records = await this.database.songs.toArray();
    return records
      .map((song) => ({
        id: song.id,
        familyId: song.familyId,
        variantName: song.variantName,
        title: song.document.song.title,
        createdAt: song.createdAt,
        updatedAt: song.updatedAt,
        ...(song.id === CANONICAL_CANON_SONG_ID
          ? {
              exampleHint:
                'Beispielsong ohne Liedtext · vorläufig 1 Schlag je Einzelton oder Akkord',
            }
          : {}),
      }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async createSong(document: SongDocument): Promise<StoredSong> {
    return this.database.transaction('rw', this.database.songs, this.database.meta, async () => {
      const stored = createStored(document, createSongId(), 1, undefined, createFamilyId());
      await this.database.songs.add(stored);
      await this.database.meta.put({ key: CURRENT_SONG_META_KEY, value: stored.id });
      await this.transactionGuard?.();
      return cloneStoredSong(stored);
    });
  }

  async renameSong(songId: string, title: string): Promise<StoredSong> {
    return this.database.transaction('rw', this.database.songs, async () => {
      const current = await this.database.songs.get(songId);
      if (!current) throw new Error('Das Lied wurde in der lokalen Ablage nicht gefunden.');
      const document = cloneDocument(current.document);
      document.song.title = title;
      const stored = createStored(
        document,
        songId,
        current.revision + 1,
        current.createdAt,
        current.familyId,
        current.variantName,
      );
      await this.database.songs.put(stored);
      await this.transactionGuard?.();
      return cloneStoredSong(stored);
    });
  }

  async duplicateSong(songId: string): Promise<StoredSong> {
    return this.database.transaction('rw', this.database.songs, async () => {
      const source = await this.database.songs.get(songId);
      if (!source) throw new Error('Das Lied wurde in der lokalen Ablage nicht gefunden.');
      const document = cloneDocument(source.document);
      document.song.title = `${source.document.song.title || 'Lied ohne Titel'} – Kopie`;
      const duplicate = createStored(document, createSongId(), 1, undefined, createFamilyId());
      await this.database.songs.add(duplicate);
      await this.transactionGuard?.();
      return cloneStoredSong(duplicate);
    });
  }

  async duplicateSongAsVariant(songId: string, variantName: string): Promise<StoredSong> {
    const normalizedName = variantName.trim();
    if (!normalizedName) throw new Error('Bitte einen Variantennamen eingeben.');
    return this.database.transaction('rw', this.database.songs, async () => {
      const source = await this.database.songs.get(songId);
      if (!source) throw new Error('Das Lied wurde in der lokalen Ablage nicht gefunden.');
      const duplicate = createStored(
        source.document,
        createSongId(),
        1,
        undefined,
        source.familyId,
        normalizedName,
      );
      await this.database.songs.add(duplicate);
      await this.transactionGuard?.();
      return cloneStoredSong(duplicate);
    });
  }

  async renameVariant(songId: string, variantName: string): Promise<StoredSong> {
    const normalizedName = variantName.trim();
    if (!normalizedName) throw new Error('Bitte einen Variantennamen eingeben.');
    return this.database.transaction('rw', this.database.songs, async () => {
      const current = await this.database.songs.get(songId);
      if (!current) throw new Error('Das Lied wurde in der lokalen Ablage nicht gefunden.');
      const stored = {
        ...current,
        variantName: normalizedName,
        revision: current.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      await this.database.songs.put(stored);
      await this.transactionGuard?.();
      return cloneStoredSong(stored);
    });
  }

  async save(document: SongDocument, songId?: string): Promise<SongDocument> {
    return this.database.transaction('rw', this.database.songs, this.database.meta, async () => {
      const resolvedSongId = songId ?? (await this.currentSongId());
      if (!resolvedSongId) throw new Error('Kein aktuelles Lied zum Speichern ausgewählt.');
      const current = await this.database.songs.get(resolvedSongId);
      if (!current) throw new Error('Das zu speichernde Lied existiert nicht mehr.');
      const stored = createStored(
        document,
        resolvedSongId,
        current.revision + 1,
        current.createdAt,
        current.familyId,
        current.variantName,
      );
      await this.database.songs.put(stored);
      await this.transactionGuard?.();
      return cloneDocument(stored.document);
    });
  }

  async replace(document: SongDocument, songId?: string): Promise<SongDocument> {
    return this.save(document, songId);
  }

  async openSong(songId: string): Promise<SongDocument> {
    return this.database.transaction('rw', this.database.songs, this.database.meta, async () => {
      const song = await this.database.songs.get(songId);
      if (!song) throw new Error('Das ausgewählte Lied wurde nicht gefunden.');
      await this.database.meta.put({ key: CURRENT_SONG_META_KEY, value: songId });
      await this.transactionGuard?.();
      return cloneDocument(song.document);
    });
  }

  async exportLocalBackupSnapshot(): Promise<LocalBackupSnapshot> {
    return this.database.transaction('r', this.database.songs, this.database.meta, async () => ({
      songs: (await this.database.songs.toArray()).map((song) => ({
        ...song,
        document: cloneDocument(song.document),
      })),
      metadata: (await this.database.meta.toArray()).map((entry) => ({ ...entry })),
    }));
  }

  async restoreLocalBackupSnapshot(snapshot: LocalBackupSnapshot): Promise<SongDocument> {
    const currentEntries = snapshot.metadata.filter((entry) => entry.key === CURRENT_SONG_META_KEY);
    const currentSongId = currentEntries[0]?.value;
    const current = snapshot.songs.find((song) => song.id === currentSongId);
    if (
      !current ||
      currentEntries.length !== 1 ||
      snapshot.songs.length === 0 ||
      new Set(snapshot.songs.map((song) => song.id)).size !== snapshot.songs.length
    ) {
      throw new Error('Die Sicherung enthält keine gültige lokale Liedablage.');
    }
    const songs = snapshot.songs.map((song) => ({
      ...song,
      document: cloneDocument(song.document),
    }));
    for (const seed of createCanonicalSeeds()) {
      if (!songs.some((song) => song.id === seed.id)) songs.push(seed);
    }
    const metadata = snapshot.metadata.map((entry) => ({ ...entry }));

    await this.database.transaction('rw', this.database.songs, this.database.meta, async () => {
      await this.database.songs.clear();
      await this.database.meta.clear();
      await this.database.songs.bulkPut(songs);
      await this.database.meta.bulkPut(metadata);
      await this.transactionGuard?.();
    });
    return cloneDocument(current.document);
  }

  async importLocalBackupAsNewSong(snapshot: LocalBackupSnapshot): Promise<StoredSong> {
    const currentEntries = snapshot.metadata.filter((entry) => entry.key === CURRENT_SONG_META_KEY);
    const source = snapshot.songs.find((song) => song.id === currentEntries[0]?.value);
    if (
      !source ||
      currentEntries.length !== 1 ||
      snapshot.songs.length === 0 ||
      new Set(snapshot.songs.map((song) => song.id)).size !== snapshot.songs.length
    ) {
      throw new Error('Die Sicherung enthält kein gültiges aktuelles Lied.');
    }

    return this.database.transaction('rw', this.database.songs, this.database.meta, async () => {
      const imported = createStored(
        source.document,
        createSongId(),
        1,
        undefined,
        createFamilyId(),
      );
      await this.database.songs.add(imported);
      await this.database.meta.put({ key: CURRENT_SONG_META_KEY, value: imported.id });
      await this.transactionGuard?.();
      return cloneStoredSong(imported);
    });
  }
}

@Injectable({ providedIn: 'root' })
export class BrowserSongRepository extends SongRepository {
  constructor() {
    super(new KalimbaDatabase());
  }
}

function createStored(
  document: SongDocument,
  id: string,
  revision: number,
  createdAt?: string,
  familyId = createFamilyId(),
  variantName = 'Original',
): StoredSong {
  const updatedAt = new Date().toISOString();
  return {
    id,
    familyId,
    variantName,
    document: cloneDocument(document),
    revision,
    createdAt: createdAt ?? updatedAt,
    updatedAt,
  };
}

function createSongId(): string {
  return `song-${crypto.randomUUID()}`;
}

function createFamilyId(): string {
  return `family-${crypto.randomUUID()}`;
}

function createCanonicalSeeds(): StoredSong[] {
  return canonicalSeedSongs().map((seed) =>
    createStored(seed.document, seed.id, 1, undefined, seed.familyId, seed.variantName),
  );
}

function cloneStoredSong(song: StoredSong): StoredSong {
  return { ...song, document: cloneDocument(song.document) };
}
