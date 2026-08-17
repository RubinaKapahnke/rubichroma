import { expect, test, type Page } from '@playwright/test';
import { resolve } from 'node:path';

const SYNTHETIC_IMPORT_FIXTURE = resolve('e2e/fixtures/synthetic-structure-song.json');

test('creates, switches and reloads independent local songs without timestamp or fidelity loss', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem('kalimba-note-tool-v1', 'library-legacy-sentinel'),
  );
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('song-file-input').setInputFiles(SYNTHETIC_IMPORT_FIXTURE);
  await expect(page.getByTestId('song-title')).toHaveValue('Prüflied ÄÖÜ – drei Zeilen');
  const imported = await readLibraryState(page);
  expect(imported.songs).toHaveLength(1);
  expect(imported.songs[0].unknownRoot).toEqual({ mustSurvive: true });

  await page.getByTestId('open-library').click();
  await expect(page.getByTestId('song-library')).toContainText('Zuletzt bearbeitet');
  await expect(page.locator('.song-library-entry')).toHaveCount(1);
  await page.getByTestId('create-song').click();

  await expect(page.getByTestId('song-title')).toHaveValue('Neues Lied');
  const created = await readLibraryState(page);
  expect(created.currentSongId).not.toBe(imported.currentSongId);
  expect(created.songs).toHaveLength(2);
  expect(created.songs.find((song) => song.id === imported.currentSongId)?.updatedAt).toBe(
    imported.songs[0].updatedAt,
  );

  await page.reload();
  await expect(page.getByTestId('song-title')).toHaveValue('Neues Lied');
  expect((await readLibraryState(page)).currentSongId).toBe(created.currentSongId);

  await page.getByTestId('open-library').click();
  const originalEntry = page.locator('.song-library-entry').filter({
    hasText: 'Prüflied ÄÖÜ – drei Zeilen',
  });
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
  await expect(page.locator('.song-library-entry')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'library-legacy-sentinel',
  );
});

interface LibraryState {
  currentSongId: string;
  songs: { id: string; title: string; updatedAt: string; unknownRoot: unknown }[];
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
              title: record.document.song.title,
              updatedAt: record.updatedAt,
              unknownRoot: record.document.extra.unknownRoot,
            })),
          });
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  });
}
