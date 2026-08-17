import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import { COMPLETE_LEGACY } from '../../../testing/fixtures/legacy-v0.fixtures';
import { encodeLegacyNotation, fidelityForEvents } from '../../domain/legacy-notation-codec';
import { MusicEvent } from '../../domain/music-event';
import { createTrackedWordFields, projectSongWordEvents } from '../../domain/song-document';
import { parseLegacyV0, stringifyVanillaCompatible } from '../legacy/legacy-v0.adapter';
import { CURRENT_SONG_META_KEY, KalimbaDatabase } from './kalimba.database';
import { SongRepository } from './song.repository';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

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
    Object.assign(imported.song.lines[0].words[0], createTrackedWordFields('(13)-x('));
    const saved = await repo.save(imported);
    const secondRepo = repository();
    const reimported = await secondRepo.migrateLegacy(stringifyVanillaCompatible(saved), saved);
    expect(reimported.song.title).toBe('Bearbeitet');
    const reimportedWord = reimported.song.lines[0].words[0];
    expect(
      encodeLegacyNotation(projectSongWordEvents(reimportedWord), reimportedWord.legacyNotation),
    ).toBe('(13)-x(');
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

  it('keeps saves bound to their stable song id across a current-song switch', async () => {
    const repo = repository();
    const first = await repo.migrateLegacy(JSON.stringify(COMPLETE_LEGACY), {
      song: { title: '', lines: [], extra: {} },
      keys: [],
      extra: {},
    });
    const firstId = (await repo.currentSongId())!;
    const firstRecord = (await repo.database.songs.get(firstId))!;
    const second = structuredClone(firstRecord);
    second.id = 'song-secondary';
    second.document.song.title = 'Second song';
    second.revision = 1;
    await repo.database.songs.put(second);

    await repo.openSong(second.id);
    const lateFirstSave = structuredClone(first);
    lateFirstSave.song.title = 'Late save for first song';
    await repo.save(lateFirstSave, firstId);

    expect(await repo.currentSongId()).toBe(second.id);
    expect((await repo.load(second.id))?.song.title).toBe('Second song');
    expect((await repo.load(firstId))?.song.title).toBe('Late save for first song');
  });

  it('keeps the previous current song when switching fails inside the transaction', async () => {
    let fail = false;
    const repo = repository(() => {
      if (fail) throw new Error('simulated switch failure');
    });
    const first = await repo.migrateLegacy(JSON.stringify(COMPLETE_LEGACY), {
      song: { title: '', lines: [], extra: {} },
      keys: [],
      extra: {},
    });
    const firstId = (await repo.currentSongId())!;
    const second = structuredClone((await repo.database.songs.get(firstId))!);
    second.id = 'song-switch-target';
    second.document.song.title = 'Switch target';
    await repo.database.songs.put(second);

    fail = true;
    await expect(repo.openSong(second.id)).rejects.toThrow('simulated switch failure');

    expect(await repo.currentSongId()).toBe(firstId);
    expect(await repo.load()).toEqual(first);
  });

  it('exports and restores the exact song record and related metadata atomically', async () => {
    const repo = repository();
    const original = await repo.migrateLegacy(JSON.stringify(COMPLETE_LEGACY), {
      song: { title: '', lines: [], extra: {} },
      keys: [],
      extra: {},
    });
    const enriched = structuredClone(original);
    enriched.song.lines[0].words[0].melodyEvents[0] = {
      ...enriched.song.lines[0].words[0].melodyEvents[0],
      duration: 2,
      eventUnknown: { nested: ['kept'] },
    } as unknown as MusicEvent;
    enriched.song.lines[0].words[0].extra['backupUnknown'] = { fidelity: true };
    await repo.save(enriched);
    await repo.database.meta.put({ key: 'profile-setting', value: '{"mode":"full"}' });
    const backup = await repo.exportLocalBackupSnapshot();

    const changed = structuredClone(enriched);
    changed.song.title = 'Temporary local change';
    await repo.save(changed);
    await repo.database.meta.put({ key: 'profile-setting', value: 'changed' });

    expect(await repo.restoreLocalBackupSnapshot(backup)).toEqual(backup.songs[0].document);
    expect(await repo.database.songs.toArray()).toEqual(backup.songs);
    expect(await repo.database.meta.toArray()).toEqual(backup.metadata);
  });

  it('rolls back both song and metadata when a restore transaction fails', async () => {
    let fail = false;
    const repo = repository(() => {
      if (fail) throw new Error('simulated restore failure');
    });
    await repo.migrateLegacy(JSON.stringify(COMPLETE_LEGACY), {
      song: { title: '', lines: [], extra: {} },
      keys: [],
      extra: {},
    });
    const before = await repo.exportLocalBackupSnapshot();
    const candidate = structuredClone(before);
    candidate.songs[0].document.song.title = 'Must roll back';
    candidate.metadata.push({ key: 'restore-only', value: 'must roll back' });

    fail = true;
    await expect(repo.restoreLocalBackupSnapshot(candidate)).rejects.toThrow(
      'simulated restore failure',
    );
    expect(await repo.exportLocalBackupSnapshot()).toEqual(before);
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
    const currentId = (await database.meta.get(CURRENT_SONG_META_KEY))?.value;
    const stored = currentId ? await database.songs.get(currentId) : undefined;
    const marker = await database.meta.get('legacy-v0-imported');

    expect(stored?.revision).toBe(4);
    expect(stored?.id).toMatch(/^song-/);
    expect(stored?.id).not.toBe('current');
    expect(stored?.createdAt).toBe('2025-01-01T00:00:00.000Z');
    expect(stored?.updatedAt).toBe('2025-01-01T00:00:00.000Z');
    expect(marker?.value).toBe('marker');
    expect('notation' in (stored?.document.song.lines[0].words[0] ?? {})).toBe(false);
    expect(stringifyVanillaCompatible(stored!.document)).toContain(
      JSON.stringify("1' 2′ 3″ (135)-7′"),
    );
  });

  it('atomically splits Dexie v2 events plus track identity and never duplicates on reopen', async () => {
    const name = `upgrade-tracks-${crypto.randomUUID()}`;
    const intermediate = parseLegacyV0(COMPLETE_LEGACY) as unknown as Record<string, any>;
    for (const line of intermediate['song']['lines']) {
      for (const word of line['words']) {
        const canonicalWord = word as ReturnType<
          typeof parseLegacyV0
        >['song']['lines'][number]['words'][number];
        word['events'] = projectSongWordEvents(canonicalWord);
        delete word['melodyEvents'];
        delete word['accompanimentEvents'];
      }
    }
    const firstWord = intermediate['song']['lines'][0]['words'][0];
    firstWord['events'][0]['eventUnknown'] = { nested: ['bleibt'] };
    const accompaniment = {
      kind: 'note',
      pitch: { degree: 7, octave: 0 },
      duration: 2,
      track: 'accompaniment',
      accompanimentUnknown: true,
    } as unknown as MusicEvent;
    firstWord['events'].splice(1, 0, accompaniment);
    firstWord['legacyNotation'] = fidelityForEvents(
      "1' 7 2â€² 3â€³ (135)-7â€²",
      firstWord['events'],
    );

    const v2 = new Dexie(name);
    v2.version(2).stores({ songs: 'id', meta: 'key' });
    await v2.table('songs').put({
      id: 'current',
      document: intermediate,
      revision: 8,
      updatedAt: '2026-08-17T10:00:00.000Z',
    });
    v2.close();

    const firstOpen = new KalimbaDatabase(name);
    databases.push(firstOpen);
    const currentId = (await firstOpen.meta.get(CURRENT_SONG_META_KEY))?.value;
    const firstStored = currentId ? await firstOpen.songs.get(currentId) : undefined;
    const migratedWord = firstStored!.document.song.lines[0].words[0];
    expect(firstStored).toMatchObject({ revision: 8, updatedAt: '2026-08-17T10:00:00.000Z' });
    expect(migratedWord.melodyEvents).toHaveLength(6);
    expect(migratedWord.accompanimentEvents).toHaveLength(1);
    expect(migratedWord.melodyEvents[0]).toMatchObject({
      eventUnknown: { nested: ['bleibt'] },
    });
    expect(migratedWord.accompanimentEvents[0]).toMatchObject({
      duration: 2,
      accompanimentUnknown: true,
    });
    expect('events' in migratedWord).toBe(false);
    firstOpen.close();

    const secondOpen = new KalimbaDatabase(name);
    const reopenedCurrentId = (await secondOpen.meta.get(CURRENT_SONG_META_KEY))?.value;
    const secondStored = reopenedCurrentId
      ? await secondOpen.songs.get(reopenedCurrentId)
      : undefined;
    expect(reopenedCurrentId).toBe(currentId);
    expect(secondStored).toEqual(firstStored);
    expect(secondStored!.document.song.lines[0].words[0].accompanimentEvents).toHaveLength(1);
    secondOpen.close();
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

  it('fails closed when a v3 database has songs but no unambiguous current record', async () => {
    const name = `upgrade-ambiguous-${crypto.randomUUID()}`;
    const v3 = new Dexie(name);
    v3.version(3).stores({ songs: 'id', meta: 'key' });
    await v3.table('songs').put({
      id: 'unexpected-song-id',
      document: parseLegacyV0(COMPLETE_LEGACY),
      revision: 3,
      updatedAt: '2026-08-17T11:00:00.000Z',
    });
    v3.close();

    const failedUpgrade = new KalimbaDatabase(name);
    await expect(failedUpgrade.open()).rejects.toThrow(
      'Dexie-v3-Ablage enthält Lieder ohne eindeutige aktuelle Auswahl.',
    );
    failedUpgrade.close();

    const verifier = new Dexie(name);
    verifier.version(3).stores({ songs: 'id', meta: 'key' });
    expect((await verifier.table('songs').toArray()).map((song) => song.id)).toEqual([
      'unexpected-song-id',
    ]);
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
