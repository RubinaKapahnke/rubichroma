import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';

const SYNTHETIC_IMPORT_FIXTURE = resolve('e2e/fixtures/synthetic-structure-song.json');

test('creates, switches and reloads independent local songs without timestamp or fidelity loss', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('edit-mode-toggle')).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem('kalimba-note-tool-v1', 'library-legacy-sentinel'),
  );
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('song-file-input').setInputFiles(SYNTHETIC_IMPORT_FIXTURE);
  await expect(page.getByTestId('song-title')).toHaveValue('Prüflied ÄÖÜ – drei Zeilen');
  const imported = await readLibraryState(page);
  expect(imported.songs).toHaveLength(3);
  expect(imported.songs.find((song) => song.id === imported.currentSongId)?.unknownRoot).toEqual({
    mustSurvive: true,
  });

  await page.getByTestId('open-library').click();
  await expect(page.getByTestId('song-library')).toContainText('Zuletzt bearbeitet');
  await expect(page.locator('.song-library-entry')).toHaveCount(3);
  await page.getByTestId('create-song').click();

  await expect(page.getByTestId('song-title')).toHaveValue('Neues Lied');
  const created = await readLibraryState(page);
  expect(created.currentSongId).not.toBe(imported.currentSongId);
  expect(created.songs).toHaveLength(4);
  expect(created.songs.find((song) => song.id === imported.currentSongId)?.updatedAt).toBe(
    imported.songs[0].updatedAt,
  );

  await page.reload();
  await expect(page.getByTestId('song-title')).toHaveValue('Neues Lied');
  expect((await readLibraryState(page)).currentSongId).toBe(created.currentSongId);

  await page.getByTestId('open-library').click();
  const originalEntry = page.getByTestId(`library-song-${imported.currentSongId}`);
  await originalEntry.getByRole('button', { name: /öffnen/i }).click();
  await expect(page.getByTestId('song-title')).toHaveValue('Prüflied ÄÖÜ – drei Zeilen');
  const reopened = await readLibraryState(page);
  expect(reopened.currentSongId).toBe(imported.currentSongId);
  expect(reopened.songs.find((song) => song.id === imported.currentSongId)?.updatedAt).toBe(
    imported.songs[0].updatedAt,
  );
  expect(reopened.songs.find((song) => song.id === imported.currentSongId)?.unknownRoot).toEqual({
    mustSurvive: true,
  });

  await page.waitForTimeout(20);
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('song-title').fill('Bibliotheks-Prüflied');
  await expect(page.locator('.save-state')).toHaveAttribute('data-status', 'saved');
  await expect
    .poll(
      async () =>
        (await readLibraryState(page)).songs.find((song) => song.id === imported.currentSongId)
          ?.title,
    )
    .toBe('Bibliotheks-Prüflied');
  const edited = await readLibraryState(page);
  expect(
    edited.songs.find((song) => song.id === imported.currentSongId)!.updatedAt >
      imported.songs[0].updatedAt,
  ).toBe(true);

  await page.getByTestId('open-player').click();
  await expect(page.getByTestId('player-title')).toHaveText('Bibliotheks-Prüflied');
  await page.getByTestId('back-to-editor').click();
  await expect(page.getByTestId('song-title')).toHaveValue('Bibliotheks-Prüflied');
  expect((await readLibraryState(page)).currentSongId).toBe(imported.currentSongId);
  await page.reload();
  await expect(page.getByTestId('song-title')).toHaveValue('Bibliotheks-Prüflied');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('open-library').click();
  await expect(page.getByTestId('song-library')).toBeVisible();
  await expect(page.locator('.song-library-entry')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'library-legacy-sentinel',
  );
});

test('renames, duplicates, searches and orders complete local songs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('edit-mode-toggle')).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem('kalimba-note-tool-v1', 'library-management-legacy-sentinel'),
  );
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('song-file-input').setInputFiles(SYNTHETIC_IMPORT_FIXTURE);
  await expect(page.getByTestId('song-title')).toHaveValue('Prüflied ÄÖÜ – drei Zeilen');
  const before = await readLibraryState(page);
  const originalId = before.currentSongId;

  await page.getByTestId('open-library').click();
  const originalEntry = page.getByTestId(`library-song-${originalId}`);
  await originalEntry.getByRole('button', { name: /umbenennen/i }).click();
  await originalEntry.locator('input[type="text"]').fill('Umbenanntes Prüflied');
  await originalEntry.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByTestId('song-title')).toHaveValue('Umbenanntes Prüflied');
  const renamed = await readLibraryState(page);
  const renamedRecord = renamed.songs.find((song) => song.id === originalId)!;
  expect(renamedRecord.updatedAt > before.songs[0].updatedAt).toBe(true);
  expect(renamedRecord.fidelity).toBe(before.songs[0].fidelity);

  await page.waitForTimeout(20);
  await page
    .locator('.song-library-entry')
    .filter({ hasText: 'Umbenanntes Prüflied' })
    .getByRole('button', { name: /duplizieren/i })
    .click();
  await page.getByTestId('duplicate-independent').click();
  await expect(page.locator('.song-library-entry')).toHaveCount(4);
  const duplicated = await readLibraryState(page);
  const copy = duplicated.songs.find((song) => song.title === 'Umbenanntes Prüflied – Kopie')!;
  expect(copy.title).toBe('Umbenanntes Prüflied – Kopie');
  expect(copy.createdAt).not.toBe(renamedRecord.createdAt);
  expect(copy.fidelity).toBe(renamedRecord.fidelity);
  expect(duplicated.currentSongId).toBe(originalId);
  await expect(page.locator('.song-library-entry').first()).toContainText(
    'Umbenanntes Prüflied – Kopie',
  );

  await page.getByTestId('library-search').fill('kopie');
  await expect(page.locator('.song-library-entry')).toHaveCount(1);
  await expect(page.locator('.song-library-entry')).toContainText('Umbenanntes Prüflied – Kopie');
  await page.getByTestId('library-search').fill('');
  await expect(page.locator('.song-library-entry')).toHaveCount(4);

  const copyTimestampBeforeOpen = copy.updatedAt;
  await page
    .locator('.song-library-entry')
    .filter({ hasText: 'Umbenanntes Prüflied – Kopie' })
    .getByRole('button', { name: /öffnen/i })
    .click();
  await expect(page.getByTestId('song-title')).toHaveValue('Umbenanntes Prüflied – Kopie');
  expect((await readLibraryState(page)).songs.find((song) => song.id === copy.id)?.updatedAt).toBe(
    copyTimestampBeforeOpen,
  );

  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('song-title').fill('Kopie bearbeitet');
  await expect
    .poll(
      async () => (await readLibraryState(page)).songs.find((song) => song.id === copy.id)?.title,
    )
    .toBe('Kopie bearbeitet');
  await page.reload();
  await expect(page.getByTestId('song-title')).toHaveValue('Kopie bearbeitet');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('open-library').click();
  await expect(page.getByTestId('library-search')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'library-management-legacy-sentinel',
  );
});

test('creates, names, opens and independently edits connected song variants', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('edit-mode-toggle')).toBeVisible();
  await page.getByTestId('open-library').click();
  const initial = await readLibraryState(page);
  const originalId = initial.currentSongId;
  const original = initial.songs.find((song) => song.id === originalId)!;
  const twinkleSeeds = initial.songs.filter((song) => song.id === 'song-system-twinkle-v1');
  const canonSeeds = initial.songs.filter((song) => song.id === 'song-system-canon-c-major-v1');
  expect(twinkleSeeds).toHaveLength(1);
  expect(canonSeeds).toHaveLength(1);
  const canonEntry = page.getByTestId('library-song-song-system-canon-c-major-v1');
  await expect(canonEntry).toContainText('Beispielsong ohne Liedtext');
  await expect(canonEntry).toContainText('1 Schlag je Einzelton oder Akkord');
  await canonEntry.getByRole('button', { name: /öffnen/i }).click();
  await expect(page.getByTestId('song-title')).toHaveValue('Canon in C-Dur');
  expect(
    (await readLibraryState(page)).songs.find((song) => song.id === 'song-system-canon-c-major-v1')
      ?.updatedAt,
  ).toBe(canonSeeds[0].updatedAt);
  await page.getByTestId('open-library').click();
  await page
    .getByTestId(`library-song-${originalId}`)
    .getByRole('button', { name: /öffnen/i })
    .click();
  await expect(page.getByTestId('song-title')).toHaveValue(original.title);
  await page.getByTestId('open-library').click();

  await page
    .getByTestId(`library-song-${originalId}`)
    .getByRole('button', { name: /duplizieren/i })
    .click();
  await expect(page.getByTestId('duplicate-song-dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  expect((await readLibraryState(page)).songs).toHaveLength(initial.songs.length);

  await page
    .getByTestId(`library-song-${originalId}`)
    .getByRole('button', { name: /duplizieren/i })
    .click();
  await page.getByTestId('duplicate-variant-name').fill('Einfach');
  await page.getByTestId('duplicate-variant').click();
  const withVariant = await readLibraryState(page);
  const variant = withVariant.songs.find(
    (song) => song.id !== originalId && song.familyId === original.familyId,
  )!;
  expect(variant.id).not.toBe(originalId);
  expect(variant.familyId).toBe(original.familyId);
  expect(variant.variantName).toBe('Einfach');
  await expect(page.locator('[data-testid^="library-family-"]')).toHaveCount(3);
  await expect(page.locator('.song-library-entry')).toHaveCount(4);
  await expect(page.getByTestId(`library-song-${originalId}`)).toContainText('Geöffnet');

  await page
    .getByTestId(`library-song-${variant.id}`)
    .getByRole('button', { name: /öffnen/i })
    .click();
  await expect(page.getByTestId('song-title')).toHaveValue(original.title);
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('song-title').fill('Nur die einfache Variante');
  await expect
    .poll(
      async () =>
        (await readLibraryState(page)).songs.find((song) => song.id === variant.id)?.title,
    )
    .toBe('Nur die einfache Variante');
  expect((await readLibraryState(page)).songs.find((song) => song.id === originalId)?.title).toBe(
    original.title,
  );

  await page.reload();
  await expect(page.getByTestId('song-title')).toHaveValue('Nur die einfache Variante');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('open-library').click();
  await expect(page.getByTestId(`library-song-${variant.id}`)).toContainText('Geöffnet');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('previews and imports pasted and uploaded text notation as independent playable songs', async ({
  page,
}) => {
  const lyricSource = `Mein Textimport
Intro
Komm mit
1 2° (1°+1+3+5) | 7
Teil A
3 4`;
  const textlessSource = `Canon-Fragment
Intro
(4+6+1°) | (1+3+5)
Teil A
1. 1 2 3 | 4
2. 4 5 6`;

  await page.goto('/');
  await expect(page.getByTestId('edit-mode-toggle')).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem('kalimba-note-tool-v1', 'text-import-legacy-sentinel'),
  );
  const initial = await readLibraryState(page);
  const initialActive = initial.songs.find((song) => song.id === initial.currentSongId)!;

  await page.getByTestId('open-library').click();
  await page.getByTestId('start-text-notation-import').click();
  await page.getByTestId('text-notation-source').fill('Unsicher\n1 2\nWie die erste Zeile');
  await expect(page.getByTestId('text-notation-preview')).toContainText('Bitte klären');
  await expect(page.getByTestId('confirm-text-notation-import')).toBeDisabled();
  expect(await readLibraryState(page)).toEqual(initial);
  await page.getByTestId('cancel-text-notation-import').click();
  expect(await readLibraryState(page)).toEqual(initial);

  await page.getByTestId('start-text-notation-import').click();
  await page.getByTestId('text-notation-source').fill(lyricSource);
  await expect(page.getByTestId('text-notation-preview')).toContainText('Mein Textimport');
  await expect(page.getByTestId('text-notation-preview')).toContainText(
    'Standardannahme: 1 Schlag',
  );
  await expect(page.getByTestId('text-notation-counts')).toContainText('1 Akkorde');
  await expect(page.getByTestId('text-notation-counts')).toContainText('1 Taktgrenzen');
  expect(await readLibraryState(page)).toEqual(initial);
  await page.getByTestId('confirm-text-notation-import').click();
  await expect(page.getByTestId('song-title')).toHaveValue('Mein Textimport');

  const firstImport = await readLibraryState(page);
  const firstImportId = firstImport.currentSongId;
  expect(firstImportId).not.toBe(initial.currentSongId);
  expect(firstImport.songs).toHaveLength(initial.songs.length + 1);
  expect(firstImport.songs.find((song) => song.id === initial.currentSongId)).toEqual(
    initialActive,
  );

  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('song-title').fill('Mein Textimport – bearbeitet');
  await expect
    .poll(
      async () =>
        (await readLibraryState(page)).songs.find((song) => song.id === firstImportId)?.title,
    )
    .toBe('Mein Textimport – bearbeitet');
  await page.reload();
  await expect(page.getByTestId('song-title')).toHaveValue('Mein Textimport – bearbeitet');

  await page.getByTestId('open-library').click();
  await page
    .getByTestId(`library-song-${initial.currentSongId}`)
    .getByRole('button', { name: /öffnen/i })
    .click();
  await expect(page.getByTestId('song-title')).toHaveValue(initialActive.title);
  await page.getByTestId('open-library').click();
  await page
    .getByTestId(`library-song-${firstImportId}`)
    .getByRole('button', { name: /öffnen/i })
    .click();
  await page.getByTestId('open-player').click();
  await expect(page.getByTestId('player-title')).toHaveText('Mein Textimport – bearbeitet');
  await page.getByTestId('back-to-editor').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('open-library').click();
  await page.getByTestId('start-text-notation-import').click();
  await page.getByTestId('text-notation-file').setInputFiles({
    name: 'canon-fragment.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(textlessSource, 'utf8'),
  });
  await expect(page.getByTestId('text-notation-preview')).toContainText('Canon-Fragment');
  await page.getByTestId('confirm-text-notation-import').click();
  await expect(page.getByTestId('song-title')).toHaveValue('Canon-Fragment');
  const secondImport = await readLibraryState(page);
  expect(secondImport.currentSongId).not.toBe(firstImportId);
  expect(secondImport.songs).toHaveLength(initial.songs.length + 2);

  await page.reload();
  await expect(page.getByTestId('song-title')).toHaveValue('Canon-Fragment');
  await page.getByTestId('open-player').click();
  await expect(page.getByTestId('player-title')).toHaveText('Canon-Fragment');
  await page.getByTestId('back-to-editor').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'text-import-legacy-sentinel',
  );
});

interface LibraryState {
  currentSongId: string;
  songs: {
    id: string;
    familyId: string;
    variantName: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    unknownRoot: unknown;
    fidelity: string;
  }[];
}

async function readLibraryState(page: Page): Promise<LibraryState> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolveDatabase, reject) => {
      const request = indexedDB.open('kalimba-angular-v1');
      request.onsuccess = () => resolveDatabase(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<LibraryState>((resolveState, reject) => {
        const transaction = database.transaction(['meta', 'songs']);
        const metaRequest = transaction.objectStore('meta').get('current-song-id');
        const songsRequest = transaction.objectStore('songs').getAll();
        transaction.oncomplete = () =>
          resolveState({
            currentSongId: metaRequest.result.value,
            songs: songsRequest.result.map((record) => ({
              id: record.id,
              familyId: record.familyId,
              variantName: record.variantName,
              title: record.document.song.title,
              createdAt: record.createdAt,
              updatedAt: record.updatedAt,
              unknownRoot: record.document.extra.unknownRoot,
              fidelity: JSON.stringify({
                root: record.document.extra,
                song: record.document.song.extra,
                lines: record.document.song.lines,
                keys: record.document.keys,
              }),
            })),
          });
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  });
}
