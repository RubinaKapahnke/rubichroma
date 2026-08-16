import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { COMPLETE_LEGACY } from '../../../testing/fixtures/legacy-v0.fixtures';
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
    imported.song.lines[0].words[0].notation = '(13)-x(';
    const saved = await repo.save(imported);
    const secondRepo = repository();
    const reimported = await secondRepo.migrateLegacy(stringifyVanillaCompatible(saved), saved);
    expect(reimported.song.title).toBe('Bearbeitet');
    expect(reimported.song.lines[0].words[0].notation).toBe('(13)-x(');
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
});
