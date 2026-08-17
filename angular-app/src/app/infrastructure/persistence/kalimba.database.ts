import Dexie, { Table } from 'dexie';
import {
  createTrackedWordFields,
  migrateSongDocumentTracks,
  SongDocument,
} from '../../domain/song-document';

export interface StoredSong {
  id: 'current';
  document: SongDocument;
  revision: number;
  updatedAt: string;
}

export interface StoredMeta {
  key: string;
  value: string;
}

export class KalimbaDatabase extends Dexie {
  songs!: Table<StoredSong, 'current'>;
  meta!: Table<StoredMeta, string>;

  constructor(name = 'kalimba-angular-v1') {
    super(name);
    this.version(1).stores({
      songs: 'id',
      meta: 'key',
    });
    this.version(2)
      .stores({
        songs: 'id',
        meta: 'key',
      })
      .upgrade(async (transaction) => {
        const songs = transaction.table<StoredSong, 'current'>('songs');
        const records = await songs.toArray();
        for (const record of records) {
          const migratedDocument = migrateStoredDocument(record.document);
          if (migratedDocument !== record.document) {
            // The schema-only conversion preserves revision and timestamp: musical semantics did not change.
            await songs.put({ ...record, document: migratedDocument });
          }
        }
      });
    this.version(3)
      .stores({
        songs: 'id',
        meta: 'key',
      })
      .upgrade(async (transaction) => {
        const songs = transaction.table<StoredSong, 'current'>('songs');
        const records = await songs.toArray();
        for (const record of records) {
          const migratedDocument = migrateStoredDocument(record.document);
          if (JSON.stringify(migratedDocument) !== JSON.stringify(record.document)) {
            await songs.put({ ...record, document: migratedDocument });
          }
        }
      });
  }
}

function migrateStoredDocument(document: SongDocument): SongDocument {
  const mutable = structuredClone(document) as SongDocument & {
    song: {
      lines: {
        words: Array<{
          notation?: unknown;
          events?: unknown;
          melodyEvents?: unknown;
          accompanimentEvents?: unknown;
          legacyNotation?: unknown;
        }>;
      }[];
    };
  };
  let changed = false;

  if (!mutable.song || !Array.isArray(mutable.song.lines)) {
    throw new Error('Dexie-v1-Song enthält keine gültigen Zeilen.');
  }
  for (const line of mutable.song.lines) {
    if (!Array.isArray(line.words)) {
      throw new Error('Dexie-v1-Song enthält keine gültigen Wörter.');
    }
    for (const word of line.words) {
      if (!isLegacyNotationFidelity(word.legacyNotation)) {
        if (typeof word.notation !== 'string') {
          throw new Error('Dexie-v1-Wort enthält keine gültige Legacy-Notation.');
        }
        Object.assign(word, createTrackedWordFields(word.notation));
        delete word.notation;
        changed = true;
      }
    }
  }
  const migrated = migrateSongDocumentTracks(mutable);
  return changed || JSON.stringify(migrated) !== JSON.stringify(document) ? migrated : document;
}

function isLegacyNotationFidelity(value: unknown): value is { raw: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { raw?: unknown }).raw === 'string'
  );
}
