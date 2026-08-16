import { describe, expect, it } from 'vitest';
import { normalizeThemePreference, resolveTheme } from './theme-preference';

describe('theme preference', () => {
  it.each([
    [null, 'system'],
    ['system', 'system'],
    ['invalid', 'system'],
    ['light', 'light'],
    ['dark', 'dark'],
  ] as const)('normalizes %s to %s', (stored, expected) => {
    expect(normalizeThemePreference(stored)).toBe(expected);
  });

  it('uses the system setting only while the preference is system', () => {
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});
