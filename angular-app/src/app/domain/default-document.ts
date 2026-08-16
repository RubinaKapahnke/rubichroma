import { SongDocument } from './song-document';
import { replaceWithLegacyNotation } from './legacy-notation-codec';

const values = [
  '2″',
  '7′',
  '5′',
  '3′',
  '1′',
  '6',
  '4',
  '2',
  '1',
  '3',
  '5',
  '7',
  '2′',
  '4′',
  '6′',
  '1″',
  '3″',
];
const letters = [
  'D',
  'B',
  'G',
  'E',
  'C',
  'A',
  'F',
  'D',
  'C',
  'E',
  'G',
  'B',
  'D',
  'F',
  'A',
  'C',
  'E',
];
const colors = [
  '#7A8CC9',
  '#864B9F',
  '#F78853',
  '#45A953',
  '#3CB8A6',
  '#F7BD30',
  '#E95784',
  '#342E38',
  '#2E7975',
  '#26562A',
  '#D41C33',
  '#6B1E69',
  '#374469',
  '#F89FB5',
  '#F8D360',
  '#A8DDBF',
  '#81B07A',
];

export const DEFAULT_DOCUMENT: SongDocument = {
  song: {
    title: 'Neuer Kalimba-Song',
    lines: [
      {
        words: [
          { text: 'Willkommen', ...replaceWithLegacyNotation('1 2 3 (135)'), extra: {} },
          { text: '♪', ...replaceWithLegacyNotation('5′-3 1′'), toneCount: 3, extra: {} },
        ],
        extra: {},
      },
    ],
    extra: {},
  },
  keys: values.map((value, index) => ({
    value,
    letter: letters[index],
    color: colors[index],
    hand: index < 8 ? 'L' : 'R',
  })),
  extra: {},
};
