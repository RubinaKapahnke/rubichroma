import { Injectable } from '@angular/core';
import { cloneDocument, SongDocument } from '../../domain/song-document';
import { parseLegacyV0 } from '../legacy/legacy-v0.adapter';
import { KalimbaDatabase, StoredSong } from './kalimba.database';
import type { LocalBackupSnapshot } from './local-backup';

const MIGRATION_MARKER = 'legacy-v0-imported';

export type TransactionGuard = () => void | Promise<void>;

export class SongRepository {
  constructor(
    readonly database: KalimbaDatabase,
    private readonly transactionGuard?: TransactionGuard,
  ) {}

  async migrateLegacy(
    legacyJson: string | null,
    defaultDocument: SongDocument,
  ): Promise<SongDocument> {
    const [existingMarker, existingSong] = await Promise.all([
      this.database.meta.get(MIGRATION_MARKER),
      this.database.songs.get('current'),
    ]);
    if (existingMarker && !existingSong) {
      throw new Error('Persistenz ist inkonsistent: Migrationsmarker ohne Song.');
    }
    if (existingMarker && existingSong) return cloneDocument(existingSong.document);

    // Parse before opening the transaction. An existing but invalid source must not silently become a default.
    const candidate =
      legacyJson === null ? cloneDocument(defaultDocument) : parseLegacyV0(legacyJson);

    return this.database.transaction('rw', this.database.songs, this.database.meta, async () => {
      const [marker, current] = await Promise.all([
        this.database.meta.get(MIGRATION_MARKER),
        this.database.songs.get('current'),
      ]);
      if (marker && !current)
        throw new Error('Persistenz ist inkonsistent: Migrationsmarker ohne Song.');
      if (current) {
        if (!marker)
          await this.database.meta.put({ key: MIGRATION_MARKER, value: new Date().toISOString() });
        return cloneDocument(current.document);
      }

      const stored = createStored(candidate, 1);
      await this.database.songs.put(stored);
      await this.transactionGuard?.();
      await this.database.meta.put({ key: MIGRATION_MARKER, value: new Date().toISOString() });
      return cloneDocument(stored.document);
    });
  }

  async load(): Promise<SongDocument | null> {
    const current = await this.database.songs.get('current');
    return current ? cloneDocument(current.document) : null;
  }

  async save(document: SongDocument): Promise<SongDocument> {
    return this.database.transaction('rw', this.database.songs, async () => {
      const current = await this.database.songs.get('current');
      const stored = createStored(document, (current?.revision ?? 0) + 1);
      await this.database.songs.put(stored);
      await this.transactionGuard?.();
      return cloneDocument(stored.document);
    });
  }

  async replace(document: SongDocument): Promise<SongDocument> {
    return this.save(document);
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
    const current = snapshot.songs.find((song) => song.id === 'current');
    if (!current || snapshot.songs.length !== 1) {
      throw new Error('Die Sicherung enthält keine gültige lokale Liedablage.');
    }
    const songs = snapshot.songs.map((song) => ({
      ...song,
      document: cloneDocument(song.document),
    }));
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
}

@Injectable({ providedIn: 'root' })
export class BrowserSongRepository extends SongRepository {
  constructor() {
    super(new KalimbaDatabase());
  }
}

function createStored(document: SongDocument, revision: number): StoredSong {
  return {
    id: 'current',
    document: cloneDocument(document),
    revision,
    updatedAt: new Date().toISOString(),
  };
}
