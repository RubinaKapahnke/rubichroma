import { describe, expect, it } from 'vitest';
import { profileInkColor } from './word-editor.component';

describe('word editor profile colors', () => {
  it('chooses text contrast without changing the stored profile color', () => {
    expect(profileInkColor('#342E38')).toBe('#ffffff');
    expect(profileInkColor('#6B1E69')).toBe('#ffffff');
    expect(profileInkColor('#F7BD30')).toBe('#171a2b');
    expect(profileInkColor('#A8DDBF')).toBe('#171a2b');
  });
});
