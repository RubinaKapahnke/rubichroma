import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const SONG_FIXTURE = resolve('e2e/fixtures/synthetic-structure-song.json');

test('opens the imported editor song in one drift-free Flow and running-tab player', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kalimba-note-tool-v1', 'issue-45-sentinel'));
  await page.locator('input[type="file"]').setInputFiles(SONG_FIXTURE);
  await expect(page.getByTestId('song-title')).toHaveValue('Prüflied ÄÖÜ – drei Zeilen');

  await page.getByTestId('word-card-0-0').click();
  await page.getByTestId('word-card-0-2').click({ modifiers: ['Shift'] });
  await page.getByTestId('open-player').click();

  await expect(page).toHaveURL(/\/player$/);
  await expect(page.getByTestId('player-title')).toHaveText('Prüflied ÄÖÜ – drei Zeilen');
  await expect(page.getByTestId('flow-panel')).toBeVisible();
  await expect(page.getByTestId('tab-panel')).toHaveCount(0);
  await expect(page.locator('.kalimba-tine')).toHaveCount(17);
  await expect(page.getByTestId('loop-enabled')).toBeChecked();
  await expect(page.getByTestId('loop-summary')).toContainText('Schlag 1 bis 6');

  const position = page.getByTestId('position');
  await position.fill('1.1');
  await expect(page.getByTestId('lyric-0-1')).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('lyric-0-0')).toHaveClass(/past/);
  await expect(page.locator('.flow-event[data-start="6"]')).toHaveCount(0);

  await page.getByTestId('play-toggle').click();
  await expect(page.getByTestId('play-toggle')).toContainText('Pause');
  const beforeJank = await position.evaluate((input: HTMLInputElement) => +input.value);
  await blockMainThread(page, 650);
  await expect
    .poll(() => position.evaluate((input: HTMLInputElement) => +input.value))
    .toBeGreaterThan(beforeJank + 0.45);

  const beforeViewSwitch = await position.evaluate((input: HTMLInputElement) => +input.value);
  await page.getByTestId('view-tab').click();
  await expect(page.getByTestId('tab-panel')).toBeVisible();
  await expect(page.getByTestId('play-toggle')).toContainText('Pause');
  await expect
    .poll(() => position.evaluate((input: HTMLInputElement) => +input.value))
    .toBeGreaterThanOrEqual(beforeViewSwitch);
  await expect(page.getByTestId('lyric-0-1')).toHaveAttribute('aria-current', 'true');

  await page.getByTestId('play-toggle').click();
  const pausedAt = await position.evaluate((input: HTMLInputElement) => +input.value);
  await page.waitForTimeout(180);
  expect(await position.evaluate((input: HTMLInputElement) => +input.value)).toBeCloseTo(
    pausedAt,
    1,
  );

  await page.getByTestId('speed').fill('50');
  await expect(page.getByTestId('speed')).toHaveValue('50');
  await position.fill('5.8');
  await page.getByTestId('play-toggle').click();
  await blockMainThread(page, 650);
  await expect
    .poll(() => position.evaluate((input: HTMLInputElement) => +input.value))
    .toBeLessThan(1.5);
  await page.getByTestId('play-toggle').click();
  await page.getByTestId('stop').click();
  await expect(position).toHaveValue('0');

  await page.reload();
  await expect(page.getByTestId('player-title')).toHaveText('Prüflied ÄÖÜ – drei Zeilen');
  await expect(page.getByTestId('view-flow')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('loop-enabled')).not.toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'issue-45-sentinel',
  );

  await page.getByTestId('back-to-editor').click();
  await expect(page.getByTestId('song-title')).toHaveValue('Prüflied ÄÖÜ – drei Zeilen');
  expect(await readUnknownFields(page)).toEqual({
    root: { mustSurvive: true },
    word: ['bleibt', 1],
    key: 0,
  });
});

test('keeps synchronized text and the 17-tine instrument usable on a narrow phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(SONG_FIXTURE);
  await page.getByTestId('open-player').click();

  await expect(page.getByTestId('reduced-motion')).toBeChecked();
  await expect(page.getByTestId('flow-panel')).toBeVisible();
  await expect(page.locator('.kalimba-tine')).toHaveCount(17);
  await expect(page.getByTestId('lyric-window')).toBeVisible();
  await expect(page.locator('.lyric-line[data-line="1"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const lyrics = await page.getByTestId('lyric-window').boundingBox();
  const flow = await page.getByTestId('flow-panel').boundingBox();
  expect(lyrics).not.toBeNull();
  expect(flow).not.toBeNull();
  expect(lyrics!.y + lyrics!.height).toBeLessThanOrEqual(flow!.y + 1);

  await page.getByTestId('position').fill('1.1');
  await expect(page.getByTestId('lyric-0-1')).toHaveAttribute('aria-current', 'true');
  await page.getByTestId('view-tab').click();
  await expect(page.getByTestId('tab-panel')).toBeVisible();
  await expect(page.getByTestId('lyric-0-1')).toHaveAttribute('aria-current', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

async function blockMainThread(page: import('@playwright/test').Page, milliseconds: number) {
  await page.evaluate((duration) => {
    const until = performance.now() + duration;
    while (performance.now() < until) {
      // Deliberately block visual frames. Tone.Transport remains the authoritative clock.
    }
  }, milliseconds);
}

async function readUnknownFields(page: import('@playwright/test').Page): Promise<{
  root: unknown;
  word: unknown;
  key: unknown;
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
      return {
        root: document['extra']['unknownRoot'],
        word: document['song']['lines'][0]['words'][0]['extra']['unknownWordField'],
        key: document['keys'][0]['unknownKeyField'],
      };
    } finally {
      database.close();
    }
  });
}
