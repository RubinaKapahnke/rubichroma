import { JsonObject } from '../../app/domain/json-value';

export const LEGACY_KEYS: JsonObject[] = Array.from({ length: 17 }, (_, index) => ({
  value: `${(index % 7) + 1}${index > 11 ? '′' : ''}`,
  letter: 'CDEFGAB'[index % 7],
  color: `#${String(index + 10).padStart(6, '0')}`,
  hand: index < 8 ? 'L' : 'R',
  customKeyField: { index },
}));

export const COMPLETE_LEGACY: JsonObject = {
  song: {
    title: 'Die Schöne – Grüße',
    customSongField: 'bleibt',
    lines: [
      {
        lineTag: 'Strophe Ä',
        words: [
          { text: 'Märchen', notation: "1' 2′ 3″ (135)-7′", wordTag: ['x', 2] },
          { text: 'angrenzend', notation: '1-2 (35)-(7′1″)' },
          { text: 'leer', notation: '' },
          { text: '♪', notation: '5′-3 x(', toneCount: 4, melodyMeta: true },
        ],
      },
    ],
  },
  keys: LEGACY_KEYS,
  unknownRoot: { nested: ['unicode', 'ß'] },
};

export const INVALID_WORD = JSON.stringify({
  song: { title: 'x', lines: [{ words: [{ text: 3, notation: '' }] }] },
  keys: LEGACY_KEYS,
});

export const INVALID_KEYS = JSON.stringify({
  song: { title: 'x', lines: [] },
  keys: LEGACY_KEYS.slice(0, 16),
});

export const INVALID_KEY_ENTRY = JSON.stringify({
  song: { title: 'x', lines: [] },
  keys: [...LEGACY_KEYS.slice(0, 16), 'not-an-object'],
});
