import Dexie from 'dexie';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_DOCUMENT } from '../../domain/default-document';
import { eventDurationInBeats } from '../../domain/music-event';
import { projectSongWordEvents } from '../../domain/song-document';
import { CANONICAL_CANON_SONG_ID, CANONICAL_TWINKLE_SONG_ID } from './canonical-seed-songs';
import { KalimbaDatabase } from './kalimba.database';
import { SongRepository } from './song.repository';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

describe('canonical example song seeds', () => {
  let database: KalimbaDatabase;
  let repository: SongRepository;

  beforeEach(() => {
    database = new KalimbaDatabase(`canonical-seeds-${crypto.randomUUID()}`);
    repository = new SongRepository(database);
  });

  afterEach(async () => {
    await database.delete();
  });

  it('adds exactly one complete Twinkle and one textless playable Canon', async () => {
    await repository.migrateLegacy(null, DEFAULT_DOCUMENT);
    await repository.ensureCanonicalTestSongs();

    const songs = await database.songs.toArray();
    expect(songs.filter((song) => song.id === CANONICAL_TWINKLE_SONG_ID)).toHaveLength(1);
    expect(songs.filter((song) => song.id === CANONICAL_CANON_SONG_ID)).toHaveLength(1);

    const twinkle = songs.find((song) => song.id === CANONICAL_TWINKLE_SONG_ID)!;
    const twinkleWords = twinkle.document.song.lines.flatMap((line) => line.words);
    expect(twinkle.document.song.lines).toHaveLength(6);
    expect(twinkle.document.keys).toHaveLength(17);
    expect(
      twinkleWords
        .flatMap((word) => word.melodyEvents)
        .filter((event) => event.kind !== 'separator')
        .reduce((beats, event) => beats + eventDurationInBeats(event), 0),
    ).toBe(48);
    expect(twinkleWords.flatMap((word) => word.accompanimentEvents).length).toBeGreaterThan(0);

    const canon = songs.find((song) => song.id === CANONICAL_CANON_SONG_ID)!;
    const canonWords = canon.document.song.lines.flatMap((line) => line.words);
    const canonEvents = canonWords
      .flatMap((word) => projectSongWordEvents(word))
      .filter((event) => event.kind !== 'separator');
    expect(canon.document.song.title).toBe('Canon in C-Dur');
    expect(canon.document.song.lines).toHaveLength(21);
    expect(canon.document.keys).toHaveLength(17);
    expect(canon.document.keys).toEqual(twinkle.document.keys);
    expect(canonWords.every((word) => word.text === '' && (word.toneCount ?? 0) > 0)).toBe(true);
    expect(canonEvents.every((event) => event.duration === 1)).toBe(true);
    expect(canonEvents.at(-1)).toMatchObject({
      kind: 'chord',
      pitches: [
        { degree: 1, octave: 1 },
        { degree: 1, octave: 0 },
        { degree: 3, octave: 0 },
        { degree: 5, octave: 0 },
      ],
    });
  });

  it('never duplicates or resets edited seeds on reload and existing-library repair', async () => {
    await repository.migrateLegacy(null, DEFAULT_DOCUMENT);
    const edited = structuredClone((await database.songs.get(CANONICAL_TWINKLE_SONG_ID))!);
    edited.document.song.title = 'Mein bearbeitetes Twinkle';
    edited.document.song.lines[0].words[0].text = 'Bearbeitet';
    await database.songs.put(edited);

    await repository.migrateLegacy(null, DEFAULT_DOCUMENT);
    await repository.ensureCanonicalTestSongs();
    expect(await database.songs.get(CANONICAL_TWINKLE_SONG_ID)).toEqual(edited);

    await database.songs.delete(CANONICAL_CANON_SONG_ID);
    const existingBefore = structuredClone(await repository.load());
    await repository.ensureCanonicalTestSongs();
    await repository.ensureCanonicalTestSongs();
    expect(await repository.load()).toEqual(existingBefore);
    expect(
      (await database.songs.toArray()).filter((song) => song.id === CANONICAL_CANON_SONG_ID),
    ).toHaveLength(1);
  });

  it('restores missing seeds atomically and rolls back a failed seed mutation', async () => {
    await repository.migrateLegacy(null, DEFAULT_DOCUMENT);
    const snapshot = await repository.exportLocalBackupSnapshot();
    snapshot.songs = snapshot.songs.filter(
      (song) => song.id !== CANONICAL_TWINKLE_SONG_ID && song.id !== CANONICAL_CANON_SONG_ID,
    );
    await repository.restoreLocalBackupSnapshot(snapshot);
    await repository.restoreLocalBackupSnapshot(snapshot);
    expect(
      (await database.songs.toArray()).filter((song) => song.id === CANONICAL_TWINKLE_SONG_ID),
    ).toHaveLength(1);
    expect(
      (await database.songs.toArray()).filter((song) => song.id === CANONICAL_CANON_SONG_ID),
    ).toHaveLength(1);

    await database.songs.bulkDelete([CANONICAL_TWINKLE_SONG_ID, CANONICAL_CANON_SONG_ID]);
    const before = await repository.exportLocalBackupSnapshot();
    const failingRepository = new SongRepository(database, () => {
      throw new Error('simulated seed failure');
    });
    await expect(failingRepository.ensureCanonicalTestSongs()).rejects.toThrow(
      'simulated seed failure',
    );
    expect(await repository.exportLocalBackupSnapshot()).toEqual(before);
  });
});
