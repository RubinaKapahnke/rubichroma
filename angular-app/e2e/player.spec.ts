import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const TWINKLE_FIXTURE = resolve('e2e/fixtures/twinkle-twinkle-little-star.json');

test('opens the imported editor song in one drift-free Flow and running-tab player', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByTestId('song-title')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('kalimba-note-tool-v1', 'issue-45-sentinel'));
  await page.locator('input[type="file"]').setInputFiles(TWINKLE_FIXTURE);
  await expect(page.getByTestId('song-title')).toHaveValue('Twinkle, Twinkle, Little Star');
  await expect(page.locator('.song-line')).toHaveCount(6);
  await expect(page.getByTestId('word-card-5-3')).toContainText('what you are');

  await page.getByTestId('word-card-0-0').click();
  await page.getByTestId('word-card-0-2').click({ modifiers: ['Shift'] });
  await page.getByTestId('open-player').click();

  await expect(page).toHaveURL(/\/player$/);
  await expect(page.getByTestId('player-title')).toHaveText('Twinkle, Twinkle, Little Star');
  await expect(page.getByTestId('flow-panel')).toBeVisible();
  await expect(page.getByTestId('tab-panel')).toHaveCount(0);
  await expect(page.locator('.kalimba-tine')).toHaveCount(17);
  await expect(page.getByTestId('score-sheet')).toBeVisible();
  await expect(page.locator('.score-entry')).toHaveCount(24);
  await expect(page.locator('.score-event')).toHaveCount(42);
  await expect(page.locator('.score-event.bar-start')).toHaveCount(11);
  await expect(page.locator('.score-event-bar')).toHaveCount(11);
  await expect(page.locator('.score-event-bar').first()).toHaveText('Takt 1');
  await expect(page.locator('.score-event-bar').last()).toHaveText('Takt 11');
  await expect(page.getByTestId('tempo-unit-bpm')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('preview-2')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('loop-enabled')).toBeChecked();
  await expect(page.getByTestId('loop-summary')).toContainText('Schlag 1 bis 6');
  await expectLaneGeometry(page, 2);

  const position = page.getByTestId('position');
  await position.fill('2.1');
  await expect(page.getByTestId('lyric-0-1')).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('lyric-0-0')).toHaveClass(/past/);
  await expect(page.locator('.flow-event[data-start="6"]')).toHaveCount(0);

  await page.getByTestId('play-toggle').click();
  await expect(page.getByTestId('play-toggle')).toContainText('Pause');
  await page.getByTestId('view-flow').click();
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

  await page.getByTestId('tempo-unit-percent').click();
  await expect(page.getByTestId('tempo-unit-percent')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('speed').fill('50');
  await expect(page.getByTestId('tempo-value')).toHaveText('50 %');
  await page.getByTestId('tempo-unit-bpm').click();
  await expect(page.getByTestId('tempo-value')).toHaveText('48 BPM');
  await page.getByTestId('tempo-unit-percent').click();
  await expect(page.getByTestId('tempo-value')).toHaveText('50 %');
  await position.fill('5.8');
  await page.getByTestId('play-toggle').click();
  await blockMainThread(page, 650);
  await expect
    .poll(() => position.evaluate((input: HTMLInputElement) => +input.value))
    .toBeLessThan(1.5);
  await page.getByTestId('play-toggle').click();
  await page.getByTestId('stop').click();
  await expect(position).toHaveValue('0');

  await page.getByTestId('preview-4').click();
  await expect(page.getByTestId('preview-4')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('metronome-enabled').check();
  await page.getByTestId('mixer-drawer').getByText('Mixer').click();
  await page.getByTestId('track-accompaniment').getByRole('checkbox').uncheck();
  await expect(page.locator('.flow-event.accompaniment')).toHaveCount(0);

  const scoreEntries = page.locator('.score-entry');
  await scoreEntries.first().click();
  await expect(position).toHaveValue('0');
  await scoreEntries.nth(3).click();
  await expect(position).toHaveValue('6');

  await page.getByTestId('loop-end-bar').selectOption('3');
  await page.getByTestId('loop-start-bar').selectOption('2');
  await expect(page.getByTestId('loop-summary')).toContainText('Takt 2–3');

  await page.getByTestId('loop-start-bar').selectOption('1');
  await page.getByTestId('loop-end-bar').selectOption('11');

  const lastScoreEntry = scoreEntries.last();
  await lastScoreEntry.click();
  await expect(position).toHaveValue('41');

  await page.reload();
  await expect(page.getByTestId('player-title')).toHaveText('Twinkle, Twinkle, Little Star');
  await expect(page.getByTestId('view-flow')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('loop-enabled')).not.toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'issue-45-sentinel',
  );

  await page.getByTestId('back-to-editor').click();
  await expect(page.getByTestId('song-title')).toHaveValue('Twinkle, Twinkle, Little Star');
  await expect(page.locator('.song-line')).toHaveCount(6);
  await page.getByTestId('song-title').fill('Twinkle – gemeinsamer Teststand');
  await page.waitForTimeout(700);
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });
  await page.reload();
  await expect(page.getByTestId('song-title')).toHaveValue('Twinkle – gemeinsamer Teststand');
  await expect(page.locator('.song-line')).toHaveCount(6);
});

test('keeps synchronized text and the 17-tine instrument usable on a narrow phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(TWINKLE_FIXTURE);
  await page.getByTestId('open-player').click();

  await expect(page.getByTestId('reduced-motion')).toBeChecked();
  await expect(page.getByTestId('flow-panel')).toBeVisible();
  await expect(page.locator('.kalimba-tine')).toHaveCount(17);
  await expect(page.getByTestId('lyric-window')).toBeVisible();
  await expect(page.locator('.lyric-line[data-line="1"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expectLaneGeometry(page, 2);

  const lyrics = await page.getByTestId('lyric-window').boundingBox();
  const flow = await page.getByTestId('flow-panel').boundingBox();
  expect(lyrics).not.toBeNull();
  expect(flow).not.toBeNull();
  const overlapsFlow =
    lyrics!.y < flow!.y + flow!.height && lyrics!.y + lyrics!.height > flow!.y;
  expect(overlapsFlow).toBe(false);

  await page.getByTestId('position').fill('2.1');
  await expect(page.getByTestId('lyric-0-1')).toHaveAttribute('aria-current', 'true');
  await page.getByTestId('view-tab').click();
  await expect(page.getByTestId('tab-panel')).toBeVisible();
  await expect(page.getByTestId('lyric-0-1')).toHaveAttribute('aria-current', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.setViewportSize({ width: 720, height: 844 });
  await page.getByTestId('view-flow').click();
  await expect(page.getByTestId('flow-panel')).toBeVisible();
  await expectLaneGeometry(page, 2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('uses the shared transport for empty lyric passages and surface keyboard controls', async ({
  page,
}) => {
  await page.goto('/player');
  await expect(page.getByTestId('player-title')).toHaveText('Neuer Kalimba-Song');

  const position = page.getByTestId('position');
  await position.fill('4.1');
  await expect(page.locator('.lyric-syllable[aria-current="true"]')).toHaveCount(0);
  await expect(page.locator('.score-entry')).toHaveCount(2);

  await page.getByTestId('flow-panel').click({ position: { x: 8, y: 8 } });
  await expect(page.getByTestId('play-toggle')).toContainText('Pause');
  await page.keyboard.press('Space');
  await expect(page.getByTestId('play-toggle')).toContainText('Start');

  await position.fill('0.1');
  await expect(page.locator('.kalimba-key.active-key')).toHaveCount(1);
  await expect(page.locator('.kalimba-key.next-key')).toHaveCount(1);
  await position.fill('0.55');
  await expect(page.locator('.kalimba-key.active-key')).toHaveCount(0);
  await expect(page.locator('.kalimba-key.next-key')).toHaveCount(1);
});

async function blockMainThread(page: import('@playwright/test').Page, milliseconds: number) {
  await page.evaluate((duration) => {
    const until = performance.now() + duration;
    while (performance.now() < until) {
      // Deliberately block visual frames. Tone.Transport remains the authoritative clock.
    }
  }, milliseconds);
}

async function expectLaneGeometry(page: import('@playwright/test').Page, tolerance: number) {
  const result = await page.evaluate(() => {
    const centers = (selector: string) =>
      [...document.querySelectorAll<HTMLElement>(selector)].map((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left + rect.width / 2;
      });
    const lanes = centers('[data-testid^="flow-lane-"]');
    const keys = centers('[data-testid^="flow-key-"]');
    const strike = document.querySelector<HTMLElement>('.strike-line')?.getBoundingClientRect();
    const trackArea = document.querySelector<HTMLElement>('.flow-track-area')?.getBoundingClientRect();
    return {
      laneCount: lanes.length,
      keyCount: keys.length,
      maxDelta: Math.max(...lanes.map((lane, index) => Math.abs(lane - keys[index]))),
      strikeWidth: strike?.width ?? 0,
      trackWidth: trackArea?.width ?? 0,
    };
  });
  expect(result.laneCount).toBe(17);
  expect(result.keyCount).toBe(17);
  expect(result.maxDelta).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(result.strikeWidth - result.trackWidth)).toBeLessThanOrEqual(tolerance);
}
