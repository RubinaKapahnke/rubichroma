import { describe, expect, it } from 'vitest';
import {
  COMPLETE_LEGACY,
  INVALID_KEY_ENTRY,
  INVALID_KEYS,
  INVALID_WORD,
} from '../../../testing/fixtures/legacy-v0.fixtures';
import { encodeLegacyNotation } from '../../domain/legacy-notation-codec';
import { exportVanillaCompatible, LegacyValidationError, parseLegacyV0 } from './legacy-v0.adapter';

describe('legacy-v0 adapter', () => {
  it('round-trips the complete legacy inventory losslessly', () => {
    const imported = parseLegacyV0(JSON.stringify(COMPLETE_LEGACY));
    const exported = exportVanillaCompatible(imported);
    expect(exported['song']).toEqual(COMPLETE_LEGACY['song']);
    expect(exported['keys']).toEqual(COMPLETE_LEGACY['keys']);
    expect(exported['unknownRoot']).toEqual(COMPLETE_LEGACY['unknownRoot']);
    expect(exported['formatVersion']).toBe(1);
  });

  it('preserves umlauts, prime variants, chords, separators, empty notation and melody toneCount', () => {
    const imported = parseLegacyV0(COMPLETE_LEGACY);
    const words = imported.song.lines[0].words;
    expect(imported.song.title).toBe('Die Schöne – Grüße');
    expect(words.map((word) => encodeLegacyNotation(word.events, word.legacyNotation))).toEqual([
      "1' 2′ 3″ (135)-7′",
      '1-2 (35)-(7′1″)',
      '',
      '5′-3 x(',
    ]);
    expect(words[3].toneCount).toBe(4);
  });

  it('uses structured events as truth after an edit instead of exporting stale raw notation', () => {
    const imported = parseLegacyV0(COMPLETE_LEGACY);
    imported.song.lines[0].words[0].events[0] = {
      kind: 'note',
      pitch: { degree: 7, octave: 2 },
      duration: 'quarter',
    };

    const exported = exportVanillaCompatible(imported);
    const song = exported['song'] as { lines: { words: { notation: string }[] }[] };
    expect(song.lines[0].words[0].notation).toBe('7″ 2′ 3″ (135) - 7′');
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
