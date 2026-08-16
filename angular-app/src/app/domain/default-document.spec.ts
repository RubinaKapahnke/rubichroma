import { describe, expect, it } from 'vitest';
import { DEFAULT_DOCUMENT } from './default-document';

describe('default RubiChroma palette', () => {
  it('maps all 17 colors to the physical C-tuned Kalimba order', () => {
    expect(DEFAULT_DOCUMENT.keys).toEqual([
      { value: '2″', letter: 'D', color: '#7A8CC9', hand: 'L' },
      { value: '7′', letter: 'B', color: '#864B9F', hand: 'L' },
      { value: '5′', letter: 'G', color: '#F78853', hand: 'L' },
      { value: '3′', letter: 'E', color: '#45A953', hand: 'L' },
      { value: '1′', letter: 'C', color: '#3CB8A6', hand: 'L' },
      { value: '6', letter: 'A', color: '#F7BD30', hand: 'L' },
      { value: '4', letter: 'F', color: '#E95784', hand: 'L' },
      { value: '2', letter: 'D', color: '#342E38', hand: 'L' },
      { value: '1', letter: 'C', color: '#2E7975', hand: 'R' },
      { value: '3', letter: 'E', color: '#26562A', hand: 'R' },
      { value: '5', letter: 'G', color: '#D41C33', hand: 'R' },
      { value: '7', letter: 'B', color: '#6B1E69', hand: 'R' },
      { value: '2′', letter: 'D', color: '#374469', hand: 'R' },
      { value: '4′', letter: 'F', color: '#F89FB5', hand: 'R' },
      { value: '6′', letter: 'A', color: '#F8D360', hand: 'R' },
      { value: '1″', letter: 'C', color: '#A8DDBF', hand: 'R' },
      { value: '3″', letter: 'E', color: '#81B07A', hand: 'R' },
    ]);
  });
});
