import { describe, expect, it } from 'vitest';
import { projectNotation, rejoinProjection } from './notation-projection';

describe('lossless notation projection', () => {
  it.each(['', "1' 2′ 3″", '(135)-7′', '1-2 (35)-(7′1″)', '5′-3 x(', '(ungeschlossen'])(
    'never changes raw notation: %s',
    (raw) => {
      expect(rejoinProjection(projectNotation(raw))).toBe(raw);
    },
  );

  it('marks unknown and unclosed syntax without discarding it', () => {
    expect(projectNotation('5′ x(').some((token) => token.kind === 'unknown')).toBe(true);
  });
});
