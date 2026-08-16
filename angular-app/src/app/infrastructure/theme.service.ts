import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  normalizeThemePreference,
  resolveTheme,
  ResolvedTheme,
  THEME_STORAGE_KEY,
  ThemePreference,
} from './theme-preference';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browserWindow = this.document.defaultView;
  private readonly colorSchemeQuery = this.browserWindow?.matchMedia?.(
    '(prefers-color-scheme: dark)',
  );

  readonly preference = signal<ThemePreference>(
    normalizeThemePreference(this.readStoredPreference()),
  );
  readonly resolvedTheme = signal<ResolvedTheme>('light');

  constructor() {
    const handleSystemThemeChange = () => {
      if (this.preference() === 'system') this.applyTheme();
    };

    this.colorSchemeQuery?.addEventListener('change', handleSystemThemeChange);
    this.destroyRef.onDestroy(() =>
      this.colorSchemeQuery?.removeEventListener('change', handleSystemThemeChange),
    );
    this.applyTheme();
  }

  setPreference(value: string): void {
    const preference = normalizeThemePreference(value);
    this.preference.set(preference);
    this.persistPreference(preference);
    this.applyTheme();
  }

  private applyTheme(): void {
    const resolved = resolveTheme(this.preference(), this.colorSchemeQuery?.matches ?? false);
    this.resolvedTheme.set(resolved);
    this.document.documentElement.dataset['theme'] = resolved;
    this.document.documentElement.style.colorScheme = resolved;
  }

  private readStoredPreference(): string | null {
    try {
      return this.browserWindow?.localStorage.getItem(THEME_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private persistPreference(preference: ThemePreference): void {
    try {
      if (preference === 'system') {
        this.browserWindow?.localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        this.browserWindow?.localStorage.setItem(THEME_STORAGE_KEY, preference);
      }
    } catch {
      // A blocked localStorage must not prevent the visual preference from working for this session.
    }
  }
}
