import { isJsonObject, JsonObject } from '../../domain/json-value';
import { cloneDocument, SongDocument } from '../../domain/song-document';
import { exportVanillaCompatible, parseLegacyV0 } from '../legacy/legacy-v0.adapter';
import { CURRENT_SONG_META_KEY } from './kalimba.database';
import type { StoredMeta, StoredSong } from './kalimba.database';

export const LOCAL_BACKUP_KIND = 'rubichroma-local-backup';
export const LOCAL_BACKUP_FORMAT_VERSION = 2;
const LEGACY_LOCAL_BACKUP_FORMAT_VERSION = 1;
const LEGACY_BACKUP_SONG_ID = 'song-imported-current';

export interface LocalBackupSnapshot {
  songs: StoredSong[];
  metadata: StoredMeta[];
}

export interface LocalBackupPreview {
  exportedAt: string;
  title: string;
  lineCount: number;
  snapshot: LocalBackupSnapshot;
}

export class LocalBackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocalBackupValidationError';
  }
}

export function serializeLocalBackup(
  snapshot: LocalBackupSnapshot,
  exportedAt = new Date().toISOString(),
): string {
  requireCurrentSong(snapshot);
  const json = JSON.stringify(
    {
      kind: LOCAL_BACKUP_KIND,
      formatVersion: LOCAL_BACKUP_FORMAT_VERSION,
      exportedAt,
      storage: {
        songs: snapshot.songs.map((song) => ({
          id: song.id,
          revision: song.revision,
          createdAt: song.createdAt,
          updatedAt: song.updatedAt,
          document: cloneDocument(song.document),
        })),
        metadata: snapshot.metadata.map((entry) => ({ ...entry })),
      },
    },
    null,
    2,
  );
  parseLocalBackup(json);
  return json;
}

export function parseLocalBackup(input: string | unknown): LocalBackupPreview {
  const root = requireObject(parseJson(input), 'Die Sicherung');
  if (root['kind'] !== LOCAL_BACKUP_KIND) {
    throw new LocalBackupValidationError('Die Datei ist keine RubiChroma-Sicherung.');
  }
  const formatVersion = root['formatVersion'];
  if (
    formatVersion !== LEGACY_LOCAL_BACKUP_FORMAT_VERSION &&
    formatVersion !== LOCAL_BACKUP_FORMAT_VERSION
  ) {
    throw new LocalBackupValidationError(
      'Diese Sicherungsversion wird von dieser RubiChroma-Version nicht unterstützt.',
    );
  }
  const exportedAt = requireDate(root['exportedAt'], 'Der Sicherungszeitpunkt');
  const storage = requireObject(root['storage'], 'Der Sicherungsinhalt');
  const songValues = requireArray(storage['songs'], 'Die Liedablage');
  if (songValues.length === 0) {
    throw new LocalBackupValidationError('Die Sicherung enthält keine lokalen Lieder.');
  }
  const songs = songValues.map((value, index): StoredSong => {
    const record = requireObject(value, `Lied ${index + 1}`);
    const sourceId = record['id'];
    if (typeof sourceId !== 'string' || sourceId.length === 0) {
      throw new LocalBackupValidationError('Die Sicherung enthält eine ungültige Lied-ID.');
    }
    if (formatVersion === LEGACY_LOCAL_BACKUP_FORMAT_VERSION && sourceId !== 'current') {
      throw new LocalBackupValidationError(
        'Die ältere Sicherung enthält eine unbekannte Liedablage.',
      );
    }
    if (formatVersion === LOCAL_BACKUP_FORMAT_VERSION && sourceId === 'current') {
      throw new LocalBackupValidationError('Die Sicherung verwendet noch keine stabile Lied-ID.');
    }
    const revision = record['revision'];
    if (typeof revision !== 'number' || !Number.isInteger(revision) || revision < 1) {
      throw new LocalBackupValidationError('Die Liedrevision der Sicherung ist ungültig.');
    }
    const updatedAt = requireDate(record['updatedAt'], 'Der letzte Speicherzeitpunkt');
    return {
      id: formatVersion === LEGACY_LOCAL_BACKUP_FORMAT_VERSION ? LEGACY_BACKUP_SONG_ID : sourceId,
      revision,
      createdAt:
        formatVersion === LEGACY_LOCAL_BACKUP_FORMAT_VERSION
          ? updatedAt
          : requireDate(record['createdAt'], 'Der Erstellungszeitpunkt'),
      updatedAt,
      document: parseCanonicalDocument(record['document']),
    };
  });
  if (new Set(songs.map((song) => song.id)).size !== songs.length) {
    throw new LocalBackupValidationError('Die Sicherung enthält doppelte Lied-IDs.');
  }

  const metadataValues = requireArray(storage['metadata'], 'Die Speichermetadaten');
  let metadata = metadataValues.map((value, index): StoredMeta => {
    const entry = requireObject(value, `Metadateneintrag ${index + 1}`);
    if (typeof entry['key'] !== 'string' || typeof entry['value'] !== 'string') {
      throw new LocalBackupValidationError('Die Speichermetadaten der Sicherung sind ungültig.');
    }
    return { key: entry['key'], value: entry['value'] };
  });
  if (new Set(metadata.map((entry) => entry.key)).size !== metadata.length) {
    throw new LocalBackupValidationError('Die Sicherung enthält doppelte Speichermetadaten.');
  }
  if (formatVersion === LEGACY_LOCAL_BACKUP_FORMAT_VERSION) {
    metadata = [
      ...metadata.filter((entry) => entry.key !== CURRENT_SONG_META_KEY),
      { key: CURRENT_SONG_META_KEY, value: LEGACY_BACKUP_SONG_ID },
    ];
  }

  const snapshot = { songs, metadata };
  const current = requireCurrentSong(snapshot);
  return {
    exportedAt,
    title: current.document.song.title,
    lineCount: current.document.song.lines.length,
    snapshot,
  };
}

function requireCurrentSong(snapshot: LocalBackupSnapshot): StoredSong {
  const currentSongId = snapshot.metadata.find(
    (entry) => entry.key === CURRENT_SONG_META_KEY,
  )?.value;
  const current = snapshot.songs.find((song) => song.id === currentSongId);
  if (
    !current ||
    snapshot.songs.length === 0 ||
    new Set(snapshot.songs.map((song) => song.id)).size !== snapshot.songs.length
  ) {
    throw new LocalBackupValidationError('Die lokale Liedablage ist nicht konsistent.');
  }
  return current;
}

function parseCanonicalDocument(value: unknown): SongDocument {
  try {
    const document = cloneDocument(value as SongDocument);
    // Reuse the portable schema parser as a complete validation projection while retaining the
    // exact canonical IndexedDB representation in the backup snapshot.
    parseLegacyV0(exportVanillaCompatible(document));
    return document;
  } catch {
    throw new LocalBackupValidationError('Das Lieddokument der Sicherung ist ungültig.');
  }
}

function parseJson(input: string | unknown): unknown {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input) as unknown;
  } catch {
    throw new LocalBackupValidationError('Die Datei enthält kein gültiges JSON.');
  }
}

function requireObject(value: unknown, label: string): JsonObject {
  if (!isJsonObject(value)) throw new LocalBackupValidationError(`${label} ist unvollständig.`);
  return value;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new LocalBackupValidationError(`${label} ist unvollständig.`);
  return value;
}

function requireDate(value: unknown, label: string): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new LocalBackupValidationError(`${label} ist ungültig.`);
  }
  return value;
}
