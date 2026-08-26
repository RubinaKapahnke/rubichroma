import { describe, expect, it } from 'vitest';
import {
  decodeLegacyNotation,
  encodeLegacyNotation,
  replaceWithLegacyNotation,
} from './legacy-notation-codec';

describe('legacy notation codec', () => {
  it('decodes legacy notes, chords and separators with a one-beat default', () => {
    const decoded = decodeLegacyNotation("1 2′ 3″ (135)-7'");

    expect(decoded.events).toEqual([
      { kind: 'note', pitch: { degree: 1, octave: 0 }, duration: 1 },
      { kind: 'note', pitch: { degree: 2, octave: 1 }, duration: 1 },
      { kind: 'note', pitch: { degree: 3, octave: 2 }, duration: 1 },
      {
        kind: 'chord',
        pitches: [
          { degree: 1, octave: 0 },
          { degree: 3, octave: 0 },
          { degree: 5, octave: 0 },
        ],
        duration: 1,
      },
      { kind: 'separator' },
      { kind: 'note', pitch: { degree: 7, octave: 1 }, duration: 1 },
    ]);
  });

  it.each(['', "1'  2′ 3″", '(135)-7′', '5′-3 x(', '(ungeschlossen'])(
    'returns the exact original raw text while events are unchanged: %s',
    (raw) => {
      const decoded = decodeLegacyNotation(raw);
      expect(encodeLegacyNotation(decoded.events, decoded.fidelity)).toBe(raw);
    },
  );

  it('does not turn malformed fragments into musical events', () => {
    const decoded = decodeLegacyNotation('5′ x(');
    expect(decoded.events).toEqual([
      { kind: 'note', pitch: { degree: 5, octave: 1 }, duration: 1 },
    ]);
    expect(decoded.hasUnknownFragments).toBe(true);
  });

  it('invalidates stale raw text after a structured change and serializes canonically', () => {
    const word = replaceWithLegacyNotation("1'  x  (35)-2");
    word.events[0] = {
      kind: 'note',
      pitch: { degree: 7, octave: 2 },
      duration: 'quarter',
    };

    expect(encodeLegacyNotation(word.events, word.legacyNotation)).toBe('7″ (35) - 2');
  });

  it('applies an explicit two-beat duration without changing legacy notation text', () => {
    const word = replaceWithLegacyNotation('5', [2]);

    expect(word.events).toEqual([
      { kind: 'note', pitch: { degree: 5, octave: 0 }, duration: 2 },
    ]);
    expect(encodeLegacyNotation(word.events, word.legacyNotation)).toBe('5');
  });
});
