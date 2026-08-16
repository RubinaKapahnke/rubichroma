import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { COMPLETE_LEGACY } from '../../../testing/fixtures/legacy-v0.fixtures';
import {
  encodeLegacyNotation,
  replaceWithLegacyNotation,
} from '../../domain/legacy-notation-codec';
import { stringifyVanillaCompatible } from '../legacy/legacy-v0.adapter';
import { KalimbaDatabase } from './kalimba.database';
import { SongRepository } from './song.repository';

const databases: KalimbaDatabase[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()));
});

function repository(guard?: () => void | Promise<void>): SongRepository {
  const database = new KalimbaDatabase(`test-${crypto.randomUUID()}`);
  databases.push(database);
  return new SongRepository(database, guard);
}

describe('SongRepository', () => {
  it('migrates legacy to IndexedDB and reloads it', async () => {
    const repo = repository();
    const migrated = await repo.migrateLegacy(JSON.stringify(COMPLETE_LEGACY), {
      song: { title: 'default', lines: [], extra: {} },
      keys: [],
      extra: {},
    });
    expect((await repo.load())?.song.title).toBe('Die Schöne – Grüße');
    expect(migrated.keys).toHaveLength(17);
  });

  it('is idempotent and never overwrites the first persisted state on a second start', async () => {
    const repo = repository();
    const first = await repo.migrateLegacy(JSON.stringify(COMPLETE_LEGACY), {
      song: { title: 'default', lines: [], extra: {} },
      keys: [],
      extra: {},
    });
    const changedSource = structuredClone(COMPLETE_LEGACY);
    (changedSource['song'] as { title: string }).title = 'new localStorage value';
    const second = await repo.migrateLegacy(JSON.stringify(changedSource), first);
    expect(second.song.title).toBe(first.song.title);
    const third = await repo.migrateLegacy('{invalid after migration', first);
    expect(third.song.title).toBe(first.song.title);
  });

  it('supports import, edit, export and reimport without losing additions', async () => {
    const repo = repository();
    const imported = await repo.migrateLegacy(JSON.stringify(COMPLETE_LEGACY), {
      song: { title: '', lines: [], extra: {} },
      keys: [],
      extra: {},
    });
    imported.song.title = 'Bearbeitet';
    Object.assign(imported.song.lines[0].words[0], replaceWithLegacyNotation('(13)-x('));
    const saved = await repo.save(imported);
    const secondRepo = repository();
    const reimported = await secondRepo.migrateLegacy(stringifyVanillaCompatible(saved), saved);
    expect(reimported.song.title).toBe('Bearbeitet');
    const reimportedWord = reimported.song.lines[0].words[0];
    expect(encodeLegacyNotation(reimportedWord.events, reimportedWord.legacyNotation)).toBe(
      '(13)-x(',
    );
    expect(reimported.extra['unknownRoot']).toEqual(COMPLETE_LEGACY['unknownRoot']);
  });

  it('rolls back a transaction when persistence fails after the put', async () => {
    let fail = false;
    const repo = repository(() => {
      if (fail) throw new Error('simulated disk failure');
    });
    const current = await repo.migrateLegacy(JSON.stringify(COMPLETE_LEGACY), {
      song: { title: '', lines: [], extra: {} },
      keys: [],
      extra: {},
    });
    const candidate = structuredClone(current);
    candidate.song.title = 'must roll back';
    fail = true;
    await expect(repo.save(candidate)).rejects.toThrow('simulated disk failure');
    expect((await repo.load())?.song.title).toBe(current.song.title);
  });

  it('writes neither song nor migration marker when initial persistence fails', async () => {
    const repo = repository(() => {
      throw new Error('simulated migration failure');
    });
    await expect(
      repo.migrateLegacy(JSON.stringify(COMPLETE_LEGACY), {
        song: { title: '', lines: [], extra: {} },
        keys: [],
        extra: {},
      }),
    ).rejects.toThrow('simulated migration failure');
    expect(await repo.load()).toBeNull();
    expect(await repo.database.meta.toArray()).toEqual([]);
  });

  it('does not mutate IndexedDB for invalid import input', async () => {
    const repo = repository();
    await repo.migrateLegacy(JSON.stringify(COMPLETE_LEGACY), {
      song: { title: '', lines: [], extra: {} },
      keys: [],
      extra: {},
    });
    expect(() => JSON.parse('{')).toThrow();
    expect((await repo.load())?.song.title).toBe('Die Schöne – Grüße');
  });

  it('atomically upgrades a real Dexie v1 song record to structured events', async () => {
    const name = `upgrade-${crypto.randomUUID()}`;
    const legacyDocument = storedV1Document();
    const v1 = new Dexie(name);
    v1.version(1).stores({ songs: 'id', meta: 'key' });
    await v1.table('songs').put({
      id: 'current',
      document: legacyDocument,
      revision: 4,
      updatedAt: '2025-01-01T00:00:00.000Z',
    });
    await v1.table('meta').put({ key: 'legacy-v0-imported', value: 'marker' });
    v1.close();

    const database = new KalimbaDatabase(name);
    databases.push(database);
    const stored = await database.songs.get('current');
    const marker = await database.meta.get('legacy-v0-imported');

    expect(stored?.revision).toBe(4);
    expect(stored?.updatedAt).toBe('2025-01-01T00:00:00.000Z');
    expect(marker?.value).toBe('marker');
    expect('notation' in (stored?.document.song.lines[0].words[0] ?? {})).toBe(false);
    expect(stringifyVanillaCompatible(stored!.document)).toContain(
      JSON.stringify("1' 2′ 3″ (135)-7′"),
    );
  });

  it('rolls back the Dexie v1 upgrade if a stored word cannot be migrated', async () => {
    const name = `upgrade-failure-${crypto.randomUUID()}`;
    const invalidDocument = storedV1Document();
    invalidDocument.song.lines[0].words[0].notation = 42 as unknown as string;
    const v1 = new Dexie(name);
    v1.version(1).stores({ songs: 'id', meta: 'key' });
    await v1.table('songs').put({
      id: 'current',
      document: invalidDocument,
      revision: 2,
      updatedAt: '2025-01-01T00:00:00.000Z',
    });
    v1.close();

    const failedUpgrade = new KalimbaDatabase(name);
    await expect(failedUpgrade.open()).rejects.toThrow(
      'Dexie-v1-Wort enthält keine gültige Legacy-Notation.',
    );
    failedUpgrade.close();

    const verifier = new Dexie(name);
    verifier.version(1).stores({ songs: 'id', meta: 'key' });
    const record = await verifier.table('songs').get('current');
    expect(record.document.song.lines[0].words[0].notation).toBe(42);
    verifier.close();
    await Dexie.delete(name);
  });
});

function storedV1Document(): {
  song: {
    title: string;
    lines: {
      words: { text: string; notation: string; toneCount?: number; extra: object }[];
      extra: object;
    }[];
    extra: object;
  };
  keys: object[];
  extra: object;
} {
  const song = COMPLETE_LEGACY['song'] as {
    title: string;
    customSongField: string;
    lines: Array<{
      lineTag: string;
      words: Array<Record<string, unknown> & { text: string; notation: string }>;
    }>;
  };
  return {
    song: {
      title: song.title,
      lines: song.lines.map((line) => ({
        words: line.words.map((word) => ({
          text: word.text,
          notation: word.notation,
          ...(word['toneCount'] === undefined ? {} : { toneCount: word['toneCount'] as number }),
          extra: Object.fromEntries(
            Object.entries(word).filter(
              ([key]) => !['text', 'notation', 'toneCount'].includes(key),
            ),
          ),
        })),
        extra: { lineTag: line.lineTag },
      })),
      extra: { customSongField: song.customSongField },
    },
    keys: structuredClone(COMPLETE_LEGACY['keys'] as object[]),
    extra: { unknownRoot: structuredClone(COMPLETE_LEGACY['unknownRoot']) },
  };
}
