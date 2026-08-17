import { isJsonObject, JsonObject } from '../../domain/json-value';
import { cloneDocument, SongDocument } from '../../domain/song-document';
import { exportVanillaCompatible, parseLegacyV0 } from '../legacy/legacy-v0.adapter';
import type { StoredMeta, StoredSong } from './kalimba.database';

export const LOCAL_BACKUP_KIND = 'rubichroma-local-backup';
export const LOCAL_BACKUP_FORMAT_VERSION = 1;

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
  const current = snapshot.songs.find((song) => song.id === 'current');
  if (!current || snapshot.songs.length !== 1) {
    throw new LocalBackupValidationError('Die lokale Liedablage ist nicht konsistent.');
  }
  const json = JSON.stringify(
    {
      kind: LOCAL_BACKUP_KIND,
      formatVersion: LOCAL_BACKUP_FORMAT_VERSION,
      exportedAt,
      storage: {
        songs: snapshot.songs.map((song) => ({
          id: song.id,
          revision: song.revision,
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
  if (root['formatVersion'] !== LOCAL_BACKUP_FORMAT_VERSION) {
    throw new LocalBackupValidationError(
      'Diese Sicherungsversion wird von dieser RubiChroma-Version nicht unterstützt.',
    );
  }
  const exportedAt = requireDate(root['exportedAt'], 'Der Sicherungszeitpunkt');
  const storage = requireObject(root['storage'], 'Der Sicherungsinhalt');
  const songValues = requireArray(storage['songs'], 'Die Liedablage');
  if (songValues.length !== 1) {
    throw new LocalBackupValidationError('Die Sicherung muss genau ein lokales Lied enthalten.');
  }
  const songs = songValues.map((value, index): StoredSong => {
    const record = requireObject(value, `Lied ${index + 1}`);
    if (record['id'] !== 'current') {
      throw new LocalBackupValidationError('Die Sicherung enthält eine unbekannte Liedablage.');
    }
    const revision = record['revision'];
    if (typeof revision !== 'number' || !Number.isInteger(revision) || revision < 1) {
      throw new LocalBackupValidationError('Die Liedrevision der Sicherung ist ungültig.');
    }
    return {
      id: 'current',
      revision,
      updatedAt: requireDate(record['updatedAt'], 'Der letzte Speicherzeitpunkt'),
      document: parseCanonicalDocument(record['document']),
    };
  });
  const metadataValues = requireArray(storage['metadata'], 'Die Speichermetadaten');
  const metadata = metadataValues.map((value, index): StoredMeta => {
    const entry = requireObject(value, `Metadateneintrag ${index + 1}`);
    if (typeof entry['key'] !== 'string' || typeof entry['value'] !== 'string') {
      throw new LocalBackupValidationError('Die Speichermetadaten der Sicherung sind ungültig.');
    }
    return { key: entry['key'], value: entry['value'] };
  });
  if (new Set(metadata.map((entry) => entry.key)).size !== metadata.length) {
    throw new LocalBackupValidationError('Die Sicherung enthält doppelte Speichermetadaten.');
  }

  const current = songs[0];
  return {
    exportedAt,
    title: current.document.song.title,
    lineCount: current.document.song.lines.length,
    snapshot: { songs, metadata },
  };
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
