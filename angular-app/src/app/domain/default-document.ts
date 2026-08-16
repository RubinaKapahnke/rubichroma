import { SongDocument } from './song-document';

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
  '#b9bbb3',
  '#e18c87',
  '#5a8fd7',
  '#9aa892',
  '#69aa91',
  '#75d29a',
  '#eca6ac',
  '#ef7b70',
  '#e5a13a',
  '#668fd8',
  '#d78cc8',
  '#728bd3',
  '#5bcf8d',
  '#a8d46d',
  '#c59ab8',
  '#7252b7',
  '#62bdd3',
];

export const DEFAULT_DOCUMENT: SongDocument = {
  song: {
    title: 'Neuer Kalimba-Song',
    lines: [
      {
        words: [
          { text: 'Willkommen', notation: '1 2 3 (135)', extra: {} },
          { text: '♪', notation: '5′-3 1′', toneCount: 3, extra: {} },
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
