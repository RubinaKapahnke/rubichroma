import { expect, test } from '@playwright/test';

test('edits title, word and raw notation and restores them after reload', async ({ page }) => {
  await page.goto('/');
  const title = page.getByTestId('song-title');
  await expect(title).toBeVisible();
  await title.fill('Reload Song äöü');
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
  await expect(page.getByTestId('word-0-0')).toHaveValue('Märchen');
  await expect(page.getByTestId('notation-0-0')).toHaveValue('(13) 5′-x(');
});
