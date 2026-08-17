import { describe, expect, it } from 'vitest';
import { COMPLETE_LEGACY } from '../../../testing/fixtures/legacy-v0.fixtures';
import type { JsonObject } from '../../domain/json-value';
import type { MusicEvent } from '../../domain/music-event';
import { parseLegacyV0 } from '../legacy/legacy-v0.adapter';
import {
  LOCAL_BACKUP_FORMAT_VERSION,
  LOCAL_BACKUP_KIND,
  LocalBackupValidationError,
  parseLocalBackup,
  serializeLocalBackup,
} from './local-backup';
import type { LocalBackupSnapshot } from './local-backup';

const EXPORTED_AT = '2026-08-17T12:00:00.000Z';
const UPDATED_AT = '2026-08-17T11:55:00.000Z';

describe('local backup format', () => {
  it('round-trips the exact canonical song, metadata, tracks, durations and unknown fields', () => {
    const snapshot = representativeSnapshot();

    const json = serializeLocalBackup(snapshot, EXPORTED_AT);
    const envelope = JSON.parse(json) as Record<string, any>;
    const preview = parseLocalBackup(json);

    expect(envelope).toMatchObject({
      kind: LOCAL_BACKUP_KIND,
      formatVersion: LOCAL_BACKUP_FORMAT_VERSION,
      exportedAt: EXPORTED_AT,
    });
    expect(envelope['storage']['songs'][0]['document']['extra']).toEqual(
      snapshot.songs[0].document.extra,
    );
    expect(preview).toMatchObject({
      exportedAt: EXPORTED_AT,
      title: snapshot.songs[0].document.song.title,
      lineCount: snapshot.songs[0].document.song.lines.length,
    });
    expect(preview.snapshot).toEqual(snapshot);
    expect(preview.snapshot.songs[0].document.song.lines[0].words[0]).toMatchObject({
      text: 'Twin-',
      melodyEvents: [{ duration: 2, eventUnknown: { remains: true } }],
      accompanimentEvents: [{ duration: 1, accompanimentUnknown: ['kept'] }],
      extra: { wordTag: ['x', 2] },
    });
    expect(preview.snapshot.songs[0].document.keys).toHaveLength(17);
  });

  it.each([
    ['invalid JSON', '{'],
    ['wrong file kind', JSON.stringify({ kind: 'other', formatVersion: 1 })],
    [
      'future format version',
      serializeLocalBackup(representativeSnapshot(), EXPORTED_AT).replace(
        '"formatVersion": 1',
        '"formatVersion": 2',
      ),
    ],
    [
      'invalid stored document',
      JSON.stringify({
        kind: LOCAL_BACKUP_KIND,
        formatVersion: LOCAL_BACKUP_FORMAT_VERSION,
        exportedAt: EXPORTED_AT,
        storage: {
          songs: [{ id: 'current', revision: 1, updatedAt: UPDATED_AT, document: {} }],
          metadata: [],
        },
      }),
    ],
  ])('rejects %s before producing a restore snapshot', (_name, json) => {
    expect(() => parseLocalBackup(json)).toThrow(LocalBackupValidationError);
  });
});

function representativeSnapshot(): LocalBackupSnapshot {
  const document = parseLegacyV0(COMPLETE_LEGACY);
  const word = document.song.lines[0].words[0];
  word.text = 'Twin-';
  word.melodyEvents = [
    {
      kind: 'note',
      pitch: { degree: 1, octave: 1 },
      duration: 2,
      eventUnknown: { remains: true },
    } as unknown as MusicEvent,
  ];
  word.accompanimentEvents = [
    {
      kind: 'note',
      pitch: { degree: 5, octave: 0 },
      duration: 1,
      accompanimentUnknown: ['kept'],
    } as unknown as MusicEvent,
  ];
  word.legacyNotation.trackOrder = ['melody', 'accompaniment'];
  word.legacyNotation.trackMetadataExplicit = true;
  word.extra = { wordTag: ['x', 2] } as JsonObject;
  return {
    songs: [{ id: 'current', revision: 7, updatedAt: UPDATED_AT, document }],
    metadata: [
      { key: 'legacy-v0-imported', value: '2026-08-17T10:00:00.000Z' },
      { key: 'future-setting', value: '{"unknown":true}' },
    ],
  };
}
