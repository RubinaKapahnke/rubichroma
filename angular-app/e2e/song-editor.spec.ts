import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

import { THEME_STORAGE_KEY } from '../src/app/infrastructure/theme-preference';

const SYNTHETIC_IMPORT_FIXTURE = resolve('e2e/fixtures/synthetic-structure-song.json');

test('renders an imported multi-line song immediately, then supports structure undo and reload', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('word-card-0-0')).toContainText('Willkommen');

  await page.locator('input[type="file"]').setInputFiles(SYNTHETIC_IMPORT_FIXTURE);

  await expect(page.getByTestId('song-title')).toHaveValue('Prüflied ÄÖÜ – drei Zeilen');
  await expect(page.locator('.song-line')).toHaveCount(3);
  await expect(page.getByTestId('word-card-0-0')).toContainText('Grüße –');
  await expect(page.getByTestId('word-card-0-2')).toContainText('Melodieblock ♪');
  await expect(page.getByTestId('word-card-2-0')).toContainText('Schluss');
  await expect(page.getByText('Willkommen')).toHaveCount(0);

  const importedUnknownFields = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('kalimba-angular-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<Record<string, unknown>>((resolve, reject) => {
        const request = database.transaction('songs').objectStore('songs').get('current');
        request.onsuccess = () => {
          const document = request.result.document;
          resolve({
            root: document.extra.unknownRoot,
            song: document.song.extra.unknownSongField,
            line: document.song.lines[0].extra.unknownLineField,
            word: document.song.lines[0].words[0].extra.unknownWordField,
            key: document.keys[0].unknownKeyField,
          });
        };
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  });
  expect(importedUnknownFields).toEqual({
    root: { mustSurvive: true },
    song: 'bleibt erhalten',
    line: 'Strophe A',
    word: ['bleibt', 1],
    key: 0,
  });

  await page.getByTestId('word-card-0-0').click();
  await page.getByTestId('block-duplicate').click();
  await expect(page.locator('[data-testid^="word-card-0-"]')).toHaveCount(4);
  await page.getByTestId('undo-structure').click();
  await expect(page.locator('[data-testid^="word-card-0-"]')).toHaveCount(3);
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });

  await page.reload();
  await expect(page.getByTestId('song-title')).toHaveValue('Prüflied ÄÖÜ – drei Zeilen');
  await expect(page.locator('.song-line')).toHaveCount(3);
  await expect(page.getByTestId('word-card-0-0')).toContainText('Grüße –');
  await expect(page.getByTestId('word-card-0-2')).toContainText('Melodieblock ♪');
  await expect(page.getByTestId('word-card-2-0')).toContainText('Schluss');
  await expect(page.getByTestId('undo-structure')).toBeDisabled();
});

test('edits title, word and raw notation and restores them after reload', async ({ page }) => {
  await page.goto('/');
  const title = page.getByTestId('song-title');
  await expect(title).toBeVisible();
  await title.fill('Reload Song äöü');
  await page.getByTestId('word-card-0-0').click();
  await page.getByTestId('word-0-0').fill('Märchen');
  await page.getByTestId('notation-0-0').fill('(13) 5′-x(');
  // Autosave is debounced by 350 ms; cross that boundary before asserting persistence.
  await page.waitForTimeout(700);
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });
  const persistedWord = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('kalimba-angular-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<Record<string, unknown>>((resolve, reject) => {
        const request = database.transaction('songs').objectStore('songs').get('current');
        request.onsuccess = () =>
          resolve(request.result.document.song.lines[0].words[0] as Record<string, unknown>);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  });
  expect(persistedWord).not.toHaveProperty('notation');
  expect(persistedWord['events']).toEqual([
    {
      kind: 'chord',
      pitches: [
        { degree: 1, octave: 0 },
        { degree: 3, octave: 0 },
      ],
      duration: 'quarter',
    },
    { kind: 'note', pitch: { degree: 5, octave: 1 }, duration: 'quarter' },
    { kind: 'separator' },
  ]);
  expect(persistedWord['legacyNotation']).toMatchObject({ raw: '(13) 5′-x(' });
  await page.reload();
  await expect(page.getByTestId('song-title')).toHaveValue('Reload Song äöü');
  await page.getByTestId('word-card-0-0').click();
  await expect(page.getByTestId('word-0-0')).toHaveValue('Märchen');
  await expect(page.getByTestId('notation-0-0')).toHaveValue('(13) 5′-x(');
});

test('edits structured notes, chords and separators in the selected word', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('word-card-0-0').click();
  const keys = page.locator('.key-button');
  await expect(keys).toHaveCount(17);
  await expect(keys.first()).toHaveAttribute('aria-label', 'D 2″, linke Hand');
  await expect(keys.last()).toHaveAttribute('aria-label', 'E 3″, rechte Hand');
  await expect(page.getByTestId('key-8-1-0')).toHaveClass(/is-used/);

  await page.getByTestId('event-remove-0').click();
  await page.getByTestId('key-8-1-0').click();
  await page.getByRole('radio', { name: 'Akkord', exact: true }).check();
  await page.getByTestId('key-9-3-0').click();
  await page.getByTestId('key-10-5-0').click();
  await expect(page.getByTestId('key-9-3-0')).toHaveClass(/is-draft/);
  await expect(page.getByTestId('key-9-3-0')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Akkord einfügen' }).click();
  await page.getByRole('button', { name: 'Trenner einfügen' }).click();

  await expect(page.getByTestId('notation-0-0')).toHaveValue('2 3 (135) 1 (35) -');
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });
  await page.reload();
  await page.getByTestId('word-card-0-0').click();
  await expect(page.getByTestId('notation-0-0')).toHaveValue('2 3 (135) 1 (35) -');
});

test('opens and closes the focused word editor as a mobile bottom sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.getByTestId('word-card-0-0').click();
  await expect(page.getByTestId('word-editor')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByTestId('block-add-word').click();
  await expect(page.getByTestId('word-card-0-1')).toBeFocused();
  await expect(page.getByTestId('word-card-0-1')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('undo-structure-editor').click();
  await expect(page.getByTestId('word-card-0-0')).toBeFocused();
  await expect(page.getByTestId('word-card-0-1')).toContainText('♪');
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole('button', { name: 'Editor schließen' }).last().click();
  await expect(page.getByTestId('word-editor')).toBeHidden();
});

test('performs block and line structure actions, transfers only events and restores them after reload', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('song-title')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('kalimba-note-tool-v1', 'user-sentinel'));

  await page.getByTestId('word-card-0-0').click();
  await page.getByTestId('block-add-word').click();
  await expect(page.getByTestId('word-0-1')).toHaveValue('Neues Wort');
  await page.getByTestId('block-delete').click();
  await expect(page.locator('[data-testid^="word-card-0-"]')).toHaveCount(2);

  await page.getByTestId('word-card-0-0').click();
  await page.getByTestId('block-add-melody').click();
  await expect(page.getByTestId('word-0-1')).toHaveValue('♪');
  await page.getByTestId('block-delete').click();

  await page.getByTestId('word-card-0-0').click();
  await page.getByTestId('block-duplicate').click();
  await expect(page.getByTestId('notation-0-1')).toHaveValue('1 2 3 (135)');
  await page.getByTestId('line-duplicate-0').click();
  await expect(page.locator('.song-line')).toHaveCount(2);
  await expect(page.locator('[data-testid^="word-card-1-"]')).toHaveCount(3);
  await page.getByTestId('line-delete-1').click();
  await expect(page.locator('.song-line')).toHaveCount(1);

  await page.getByTestId('line-add-0').click();
  await expect(page.locator('.song-line')).toHaveCount(2);
  await page.getByTestId('word-card-0-0').click();
  await page.getByTestId('block-copy-next-line').click();
  await expect(page.getByTestId('word-1-0')).toHaveValue('Neue Zeile');
  await expect(page.getByTestId('notation-1-0')).toHaveValue('1 2 3 (135)');
  await expect(page.getByTestId('word-card-1-0')).toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');

  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1')))
    .toBe('user-sentinel');
  await page.reload();

  await expect(page.locator('.song-line')).toHaveCount(2);
  await page.getByTestId('word-card-1-0').click();
  await expect(page.getByTestId('word-1-0')).toHaveValue('Neue Zeile');
  await expect(page.getByTestId('notation-1-0')).toHaveValue('1 2 3 (135)');
  await expect(page.getByTestId('undo-structure')).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'user-sentinel',
  );
});

test('undoes structure actions in session order and restores selection and keyboard focus', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('word-card-0-0').focus();
  await page.getByTestId('word-card-0-0').press('Enter');

  await page.getByTestId('block-duplicate').click();
  await expect(page.getByTestId('word-card-0-1')).toBeFocused();
  await page.getByTestId('line-duplicate-0').click();
  await expect(page.getByTestId('word-card-1-0')).toBeFocused();
  await expect(page.locator('.song-line')).toHaveCount(2);

  await page.getByTestId('undo-structure').click();
  await expect(page.locator('.song-line')).toHaveCount(1);
  await expect(page.getByTestId('word-card-0-1')).toBeFocused();
  await expect(page.getByTestId('word-card-0-1')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('undo-structure').click();
  await expect(page.locator('[data-testid^="word-card-0-"]')).toHaveCount(2);
  await expect(page.getByTestId('word-card-0-0')).toBeFocused();
  await expect(page.getByTestId('undo-structure')).toBeDisabled();
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
});

test('keeps selection and focus stable during keyboard navigation', async ({ page }) => {
  await page.goto('/');
  const firstWord = page.getByTestId('word-card-0-0');
  const secondWord = page.getByTestId('word-card-0-1');

  await firstWord.focus();
  await firstWord.press('Enter');
  await firstWord.press('ArrowRight');
  await expect(secondWord).toBeFocused();
  await expect(secondWord).toHaveAttribute('aria-pressed', 'true');

  await secondWord.press('Escape');
  await expect(page.getByTestId('word-editor')).toBeHidden();
});

test('selects desktop ranges, copies notes and chords, pastes with undo and persists after reload', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('song-title')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('kalimba-note-tool-v1', 'user-sentinel'));
  await page.locator('input[type="file"]').setInputFiles(SYNTHETIC_IMPORT_FIXTURE);

  const sourceFirst = page.getByTestId('word-card-0-0');
  const sourceMiddle = page.getByTestId('word-card-0-1');
  const sourceLast = page.getByTestId('word-card-0-2');
  await sourceFirst.click();
  await sourceLast.click({ modifiers: ['Shift'] });
  await expect(page.getByTestId('selection-count')).toHaveText('3 Blöcke ausgewählt');
  await expect(sourceMiddle).toHaveAttribute('aria-pressed', 'true');

  await sourceMiddle.click({ modifiers: ['Control'] });
  await expect(page.getByTestId('selection-count')).toHaveText('2 Blöcke ausgewählt');
  await expect(sourceMiddle).toHaveAttribute('aria-pressed', 'false');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const toolbar = page.getByTestId('selection-toolbar');
  await expect(toolbar).toBeVisible();
  const toolbarBox = await toolbar.boundingBox();
  expect(toolbarBox).not.toBeNull();
  expect(toolbarBox!.y).toBeGreaterThanOrEqual(0);
  expect(toolbarBox!.y + toolbarBox!.height).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerHeight),
  );

  await page.getByTestId('copy-selection').click();
  await expect(page.getByTestId('clipboard-count')).toHaveText('2 kopiert');

  const targetFirst = page.getByTestId('word-card-1-0');
  const targetLast = page.getByTestId('word-card-1-1');
  await targetFirst.click();
  await targetLast.click({ modifiers: ['Shift'] });
  await expect(page.getByTestId('selection-count')).toHaveText('2 Blöcke ausgewählt');
  await page.getByTestId('paste-selection').click();

  await expect(page.getByTestId('notation-1-1')).toHaveValue('3′ - 4′ (2′5′) 1′');
  await expect(targetLast).toBeFocused();
  await expect(targetFirst).toHaveAttribute('aria-pressed', 'true');
  await expect(targetLast).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });

  const pastedState = await readPasteState(page);
  expect(pastedState).toEqual({
    targetTexts: ['zweite', 'Zeile'],
    targetKinds: [['chord'], ['note', 'separator', 'note', 'chord', 'note']],
    unknownRoot: { mustSurvive: true },
    unknownSource: ['bleibt', 1],
    unknownTarget: { mustSurvive: true },
    legacySource: 'user-sentinel',
  });

  await page.getByTestId('undo-structure').click();
  await expect(page.getByTestId('selection-count')).toHaveText('2 Blöcke ausgewählt');
  await expect(page.getByTestId('notation-1-1')).toHaveValue('(357)-');
  await expect(targetLast).toBeFocused();
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });
  expect((await readPasteState(page)).targetKinds).toEqual([
    ['note', 'note'],
    ['chord', 'separator'],
  ]);

  await page.getByTestId('paste-selection').click();
  await expect(page.getByTestId('notation-1-1')).toHaveValue('3′ - 4′ (2′5′) 1′');
  await expect
    .poll(async () => (await readPasteState(page)).targetKinds)
    .toEqual([['chord'], ['note', 'separator', 'note', 'chord', 'note']]);
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });
  await page.reload();

  await page.getByTestId('word-card-1-0').click();
  await expect(page.getByTestId('word-1-0')).toHaveValue('zweite');
  await expect(page.getByTestId('notation-1-0')).toHaveValue('(13)');
  await page.getByTestId('word-card-1-1').click();
  await expect(page.getByTestId('word-1-1')).toHaveValue('Zeile');
  await expect(page.getByTestId('notation-1-1')).toHaveValue('3′ - 4′ (2′5′) 1′');
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'user-sentinel',
  );
  expect((await readPasteState(page)).unknownTarget).toEqual({ mustSurvive: true });
});

test('stores a manual theme and restores it after reload', async ({ page }) => {
  await page.goto('/');
  const themeSelect = page.getByTestId('theme-select');

  await expect(themeSelect).toHaveValue('system');
  await themeSelect.selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY))
    .toBe('dark');

  await page.reload();
  await expect(themeSelect).toHaveValue('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await themeSelect.selectOption('system');
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY))
    .toBeNull();
});

async function readPasteState(page: import('@playwright/test').Page): Promise<{
  targetTexts: string[];
  targetKinds: string[][];
  unknownRoot: unknown;
  unknownSource: unknown;
  unknownTarget: unknown;
  legacySource: string | null;
}> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('kalimba-angular-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const document = await new Promise<Record<string, any>>((resolve, reject) => {
        const request = database.transaction('songs').objectStore('songs').get('current');
        request.onsuccess = () => resolve(request.result.document as Record<string, any>);
        request.onerror = () => reject(request.error);
      });
      const targets = document['song']['lines'][1]['words'];
      return {
        targetTexts: targets.map((word: Record<string, any>) => word['text']),
        targetKinds: targets.map((word: Record<string, any>) =>
          word['events'].map((event: Record<string, any>) => event['kind']),
        ),
        unknownRoot: document['extra']['unknownRoot'],
        unknownSource: document['song']['lines'][0]['words'][0]['extra']['unknownWordField'],
        unknownTarget: targets[0]['extra']['unknownPasteTarget'],
        legacySource: localStorage.getItem('kalimba-note-tool-v1'),
      };
    } finally {
      database.close();
    }
  });
}
