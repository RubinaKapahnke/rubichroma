import { describe, expect, it } from 'vitest';
import { fidelityForEvents } from './legacy-notation-codec';
import { hasParallelTineCollision, MusicEvent } from './music-event';
import { migrateSongDocumentTracks, projectSongWordEvents } from './song-document';

describe('canonical song word tracks', () => {
  it('migrates every events-only entry to melody without losing event unknown fields', () => {
    const events = [
      { kind: 'note', pitch: { degree: 1, octave: 0 }, duration: 2, eventUnknown: ['bleibt'] },
      { kind: 'chord', pitches: [{ degree: 3, octave: 0 }], duration: 1 },
    ] as unknown as MusicEvent[];
    const migrated = migrateSongDocumentTracks(legacyDocument(events));
    const word = migrated.song.lines[0].words[0];

    expect(word.melodyEvents).toHaveLength(2);
    expect(word.accompanimentEvents).toEqual([]);
    expect(word.melodyEvents[0]).toMatchObject({ duration: 2, eventUnknown: ['bleibt'] });
    expect(projectSongWordEvents(word).map((event) => event.track)).toEqual(['melody', 'melody']);
    expect('events' in word).toBe(false);
  });

  it('splits the current events plus track intermediate model deterministically and idempotently', () => {
    const events = [
      { kind: 'note', pitch: { degree: 1, octave: 0 }, duration: 1, track: 'melody' },
      {
        kind: 'chord',
        pitches: [{ degree: 1, octave: 0 }],
        duration: 2,
        track: 'accompaniment',
        eventUnknown: { nested: true },
      },
      { kind: 'note', pitch: { degree: 5, octave: 0 }, duration: 1, track: 'melody' },
    ] as unknown as MusicEvent[];
    const first = migrateSongDocumentTracks(legacyDocument(events));
    const second = migrateSongDocumentTracks(first);
    const word = second.song.lines[0].words[0];

    expect(first).toEqual(second);
    expect(word.melodyEvents).toHaveLength(2);
    expect(word.accompanimentEvents).toHaveLength(1);
    expect(word.accompanimentEvents[0]).toMatchObject({
      duration: 2,
      eventUnknown: { nested: true },
    });
    expect(word.melodyEvents.every((event) => event.track === undefined)).toBe(true);
    expect(word.accompanimentEvents.every((event) => event.track === undefined)).toBe(true);
    expect(projectSongWordEvents(word).map((event) => event.track)).toEqual([
      'melody',
      'accompaniment',
      'melody',
    ]);
    expect(hasParallelTineCollision(projectSongWordEvents(word))).toBe(true);
    expect(word.extra).toEqual({ blockUnknown: 42 });
    expect(second.song.lines[0].extra).toEqual({ lineUnknown: true });
    expect(second.extra).toEqual({ rootUnknown: ['bleibt'] });
  });
});

function legacyDocument(events: MusicEvent[]) {
  return {
    song: {
      title: 'Migration',
      lines: [
        {
          words: [
            {
              text: 'Block',
              events,
              legacyNotation: fidelityForEvents('1 (3) 5', events),
              extra: { blockUnknown: 42 },
            },
          ],
          extra: { lineUnknown: true },
        },
      ],
      extra: { songUnknown: 'bleibt' },
    },
    keys: [],
    extra: { rootUnknown: ['bleibt'] },
  };
}
