import { describe, expect, it } from 'vitest';
import {
  COMPLETE_LEGACY,
  INVALID_KEY_ENTRY,
  INVALID_KEYS,
  INVALID_WORD,
} from '../../../testing/fixtures/legacy-v0.fixtures';
import { encodeLegacyNotation } from '../../domain/legacy-notation-codec';
import { projectSongWordEvents } from '../../domain/song-document';
import { exportVanillaCompatible, LegacyValidationError, parseLegacyV0 } from './legacy-v0.adapter';

describe('legacy-v0 adapter', () => {
  it('upgrades the complete legacy inventory to an idempotent canonical export', () => {
    const imported = parseLegacyV0(JSON.stringify(COMPLETE_LEGACY));
    const exported = exportVanillaCompatible(imported);
    const reparsed = parseLegacyV0(exported);
    expect(exportVanillaCompatible(reparsed)).toEqual(exported);
    expect((exported['song'] as Record<string, unknown>)['title']).toEqual(
      (COMPLETE_LEGACY['song'] as Record<string, unknown>)['title'],
    );
    expect(exported['keys']).toEqual(COMPLETE_LEGACY['keys']);
    expect(exported['unknownRoot']).toEqual(COMPLETE_LEGACY['unknownRoot']);
    expect(exported['formatVersion']).toBe(2);
  });

  it('preserves umlauts, prime variants, chords, separators, empty notation and melody toneCount', () => {
    const imported = parseLegacyV0(COMPLETE_LEGACY);
    const words = imported.song.lines[0].words;
    expect(imported.song.title).toBe('Die Schöne – Grüße');
    expect(
      words.map((word) => encodeLegacyNotation(projectSongWordEvents(word), word.legacyNotation)),
    ).toEqual(["1' 2′ 3″ (135)-7′", '1-2 (35)-(7′1″)', '', '5′-3 x(']);
    expect(words[3].toneCount).toBe(4);
  });

  it('uses structured events as truth after an edit instead of exporting stale raw notation', () => {
    const imported = parseLegacyV0(COMPLETE_LEGACY);
    imported.song.lines[0].words[0].melodyEvents[0] = {
      kind: 'note',
      pitch: { degree: 7, octave: 2 },
      duration: 'quarter',
    };

    const exported = exportVanillaCompatible(imported);
    const song = exported['song'] as { lines: { words: { notation: string }[] }[] };
    expect(song.lines[0].words[0].notation).toBe('7″ 2′ 3″ (135) - 7′');
  });

  it('round-trips explicit event durations while legacy documents still default to one beat', () => {
    const input = structuredClone(COMPLETE_LEGACY) as Record<string, any>;
    const firstWord = input['song']['lines'][0]['words'][0] as Record<string, unknown>;
    firstWord['eventDurations'] = [1, 1, 1, 1, null, 2];

    const imported = parseLegacyV0(input);
    expect(
      projectSongWordEvents(imported.song.lines[0].words[0]).map((event) =>
        event.kind === 'separator' ? undefined : event.duration,
      ),
    ).toEqual([1, 1, 1, 1, undefined, 2]);
    const exported = exportVanillaCompatible(imported);
    const exportedWord = (exported['song'] as { lines: { words: Record<string, unknown>[] }[] })
      .lines[0].words[0];
    expect(exportedWord['notation']).toBe("1' 2′ 3″ (135)-7′");
    expect(exportedWord['eventDurations']).toEqual([1, 1, 1, 1, null, 2]);

    const legacyOnly = exportVanillaCompatible(parseLegacyV0(COMPLETE_LEGACY));
    const legacyWord = (legacyOnly['song'] as { lines: { words: Record<string, unknown>[] }[] })
      .lines[0].words[0];
    expect(legacyWord).not.toHaveProperty('eventDurations');
  });

  it('round-trips explicit melody and accompaniment identity without changing legacy defaults', () => {
    const input = structuredClone(COMPLETE_LEGACY) as Record<string, any>;
    const firstWord = input['song']['lines'][0]['words'][0] as Record<string, unknown>;
    firstWord['eventTracks'] = ['melody', 'melody', 'melody', 'accompaniment', null, 'melody'];

    const imported = parseLegacyV0(input);
    const word = imported.song.lines[0].words[0];
    expect(word.melodyEvents).toHaveLength(5);
    expect(word.accompanimentEvents).toHaveLength(1);
    expect(
      projectSongWordEvents(word).map((event) =>
        event.kind === 'separator' ? null : (event.track ?? null),
      ),
    ).toEqual(firstWord['eventTracks']);
    const exported = exportVanillaCompatible(imported);
    const exportedWord = (exported['song'] as { lines: { words: Record<string, unknown>[] }[] })
      .lines[0].words[0];
    expect(exportedWord['eventTracks']).toEqual(firstWord['eventTracks']);
    expect(exportedWord['notation']).toBe(firstWord['notation']);

    const legacyOnly = exportVanillaCompatible(parseLegacyV0(COMPLETE_LEGACY));
    const legacyWord = (legacyOnly['song'] as { lines: { words: Record<string, unknown>[] }[] })
      .lines[0].words[0];
    expect(legacyWord).not.toHaveProperty('eventTracks');
  });

  it('round-trips both canonical rows and event-level unknown fields without duplication', () => {
    const document = parseLegacyV0(COMPLETE_LEGACY);
    const word = document.song.lines[0].words[0];
    word.accompanimentEvents.push({
      kind: 'note',
      pitch: { degree: 6, octave: 0 },
      duration: 2,
      eventUnknown: { keep: true },
    } as never);

    const firstExport = exportVanillaCompatible(document);
    const firstImport = parseLegacyV0(firstExport);
    const secondImport = parseLegacyV0(exportVanillaCompatible(firstImport));

    expect(firstImport.song.lines[0].words[0].accompanimentEvents).toEqual(
      secondImport.song.lines[0].words[0].accompanimentEvents,
    );
    expect(firstImport.song.lines[0].words[0].accompanimentEvents).toHaveLength(1);
    expect(firstImport.song.lines[0].words[0].accompanimentEvents[0]).toMatchObject({
      duration: 2,
      eventUnknown: { keep: true },
    });
  });

  it('round-trips canonical rests, time signature and unknown fields while legacy defaults to 4/4', () => {
    const document = parseLegacyV0(COMPLETE_LEGACY);
    expect(document.song.timeSignature).toEqual({ numerator: 4, denominator: 4 });
    document.song.timeSignature = { numerator: 6, denominator: 8 };
    document.song.lines[0].words[0].melodyEvents.splice(1, 0, {
      kind: 'rest',
      duration: 0.75,
      restUnknown: 'keep',
    } as never);
    document.song.lines[0].words[0].accompanimentEvents = [
      {
        kind: 'chord',
        pitches: [
          { degree: 1, octave: 0 },
          { degree: 3, octave: 0 },
        ],
        duration: 1,
        playback: { style: 'arpeggio-up', stepBeats: 0.125 },
      },
      {
        kind: 'glissando',
        startPitch: { degree: 1, octave: 0 },
        endPitch: { degree: 3, octave: 0 },
        direction: 'ascending',
        pitches: [
          { degree: 1, octave: 0 },
          { degree: 2, octave: 0 },
          { degree: 3, octave: 0 },
        ],
        duration: 0.5,
        stepBeats: 0.125,
      },
    ];

    const reparsed = parseLegacyV0(exportVanillaCompatible(document));
    expect(reparsed.song.timeSignature).toEqual({ numerator: 6, denominator: 8 });
    expect(reparsed.song.lines[0].words[0].melodyEvents[1]).toMatchObject({
      kind: 'rest',
      duration: 0.75,
      restUnknown: 'keep',
    });
    expect(reparsed.song.lines[0].words[0].accompanimentEvents).toEqual(
      document.song.lines[0].words[0].accompanimentEvents,
    );
  });

  it.each([
    ['invalid JSON', '{'],
    ['invalid key count', INVALID_KEYS],
    ['invalid key entry', INVALID_KEY_ENTRY],
    ['invalid word', INVALID_WORD],
  ])('rejects %s before producing a document', (_label, input) => {
    expect(() => parseLegacyV0(input)).toThrow(LegacyValidationError);
  });
});
