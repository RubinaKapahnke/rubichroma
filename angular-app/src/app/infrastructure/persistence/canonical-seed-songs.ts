import { cloneJson } from '../../domain/json-value';
import { createTrackedWordFields, SongDocument } from '../../domain/song-document';
import { DEFAULT_DOCUMENT } from '../../domain/default-document';
import { parseLegacyV0 } from '../legacy/legacy-v0.adapter';
import canonicalTwinkleSource from './twinkle-twinkle-little-star.json';

export const CANONICAL_TWINKLE_SONG_ID = 'song-system-twinkle-v1';
export const CANONICAL_TWINKLE_FAMILY_ID = 'family-system-twinkle-v1';
export const CANONICAL_CANON_SONG_ID = 'song-system-canon-c-major-v1';
export const CANONICAL_CANON_FAMILY_ID = 'family-system-canon-c-major-v1';

export interface CanonicalSeedSong {
  id: string;
  familyId: string;
  variantName: string;
  document: SongDocument;
}

interface CanonRow {
  section: string;
  number: number;
  notation: string;
  sequenceIndex?: number;
}

const CANON_INTRO = ['(4+6+1°) | (1+3+5) | (4+6+1°) | (5+7+2°)'];
const CANON_PART_A = [
  '(3°+1) 5 1° 3° (2°+2) 5 7 2° | (1°+1) 3 6 1° (7+3) 2 3 5',
  '(6+1) 1 4 6 (5+1) 2 3 5 | (6+1) 4 5 6 (7+2) 5 7 2°',
  '(4°+1) 3° (2°+4) | 4° (3°+1) 2° (1°+3) | 7 (6+1) 5 6 1° (1°+2) 5 7',
  '(5°+1) 3° 4° (5°+3) | 3° 4° (5°+2) | 5 6 7 (1°+5) 2° 3° 4° (3°+1)',
  '3 4 5 (4+1) 6 5 4 | 3 2 (1+3) 2 1 2 3',
  '4 5 6 (4+1) 6 5 6 | 7 1° (7+2) 6 5 6 7 1° 2° 3°',
];
const CANON_PART_A_SEQUENCE = [0, 1, 2, 3, 4, 5, 3, 4, 5, 3] as const;
const CANON_PART_B = [
  '1° 2° (3°+3) 3 4 (3+5) 6 5 4 5',
  '1° 7 1° (6+1) | 1° 7 (4+6) | 5 4 (5+1) 4 3 4 5',
  '6 7 1° (6+1) | 1° 7 1° 7 6 (7+2) 1° 2° | 1° 7 7 6 7 (1°+1) 3 5',
  '5° (5°+5+7+2°) 6° (5°+5) | 4° (3°+1) 3 6',
  '3° (3°+3+5+7) | 4° (3°+5) 2° (1°+1) | 7 (4+6) 7 1°',
  '4 6 (1°+2) 7 6 1° (5+7)',
  '1° 2° (3°+3) 3 4 (3+5) 6 5 4 5',
  '(5°+1) 3 5 | 5° (5°+5+7+2°) 6° (5°+5) | 4° (3°+1) 3 6',
  '3° (3°+3+5+7) | 4° (3°+5) 2° (1°+1) | 7 (4+6) 7 1°',
];
const CANON_ENDING = ['4 (1°+2) 7 6 1° (5+7) | (1°+1+3+5)'];

export function canonicalSeedSongs(): CanonicalSeedSong[] {
  return [
    {
      id: CANONICAL_TWINKLE_SONG_ID,
      familyId: CANONICAL_TWINKLE_FAMILY_ID,
      variantName: 'Original',
      document: parseLegacyV0(JSON.stringify(canonicalTwinkleSource)),
    },
    {
      id: CANONICAL_CANON_SONG_ID,
      familyId: CANONICAL_CANON_FAMILY_ID,
      variantName: 'Original',
      document: createCanonicalCanonDocument(),
    },
  ];
}

export function createCanonicalCanonDocument(): SongDocument {
  const rows: CanonRow[] = [
    ...CANON_INTRO.map((notation, index) => ({ section: 'Intro', number: index + 1, notation })),
    ...CANON_PART_A_SEQUENCE.map((sourceIndex, sequenceIndex) => ({
      section: 'Teil A',
      number: sourceIndex + 1,
      sequenceIndex: sequenceIndex + 1,
      notation: CANON_PART_A[sourceIndex],
    })),
    ...CANON_PART_B.map((notation, index) => ({
      section: 'Teil B',
      number: index + 1,
      notation,
    })),
    ...CANON_ENDING.map((notation, index) => ({
      section: 'Schluss',
      number: index + 1,
      notation,
    })),
  ];
  return {
    song: {
      title: 'Canon in C-Dur',
      lines: rows.map((row) => {
        const notation = canonNotationToLegacy(row.notation);
        const tracked = createTrackedWordFields(notation);
        return {
          words: [
            {
              text: '',
              ...tracked,
              toneCount: tracked.melodyEvents.filter((event) => event.kind !== 'separator').length,
              extra: {
                structure: {
                  section: row.section,
                  number: row.number,
                  ...('sequenceIndex' in row ? { sequenceIndex: row.sequenceIndex } : {}),
                },
              },
            },
          ],
          extra: {},
        };
      }),
      extra: {
        exampleSong: {
          rhythmAssumption: 'one-beat-per-written-event',
          repeatExpansion: 'Teil A: 1-2-3-4-5-6-4-5-6-4',
          performanceNote: 'Schlussakkord mit beiden Daumen möglichst geschlossen',
        },
      },
    },
    keys: DEFAULT_DOCUMENT.keys.map((key) => cloneJson(key)),
    extra: {},
  };
}

function canonNotationToLegacy(notation: string): string {
  return notation.replaceAll('+', '').replaceAll('°', '′');
}
