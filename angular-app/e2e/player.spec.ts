import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const TWINKLE_FIXTURE = resolve('e2e/fixtures/twinkle-twinkle-little-star.json');

test('opens the imported editor song in one drift-free Flow and running-tab player', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('song-title')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('kalimba-note-tool-v1', 'issue-45-sentinel'));
  await page.getByTestId('song-file-input').setInputFiles(TWINKLE_FIXTURE);
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
  await expect(page.locator('.score-event')).toHaveCount(48);
  await expect(page.locator('.score-event.bar-start')).toHaveCount(18);
  await expect(page.locator('.score-event-bar')).toHaveCount(18);
  await expect(page.locator('.score-event-bar').first()).toHaveText('Takt 1');
  await expect(page.locator('.score-event-bar').last()).toHaveText('Takt 12');
  await expect(page.getByTestId('tempo-unit-bpm')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('practice-settings-status')).toHaveText('Standard');
  await openPracticeSettings(page);
  await expect(page.getByTestId('preview-2')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('loop-enabled')).not.toBeChecked();
  await expect(page.getByTestId('loop-summary')).toContainText('Schlag 1 bis 8');
  await expectLaneGeometry(page, 2);

  const position = page.getByTestId('position');
  await expect(position).toHaveAttribute('max', '48');
  await position.fill('2.1');
  await expect(page.getByTestId('lyric-0-1')).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('lyric-0-0')).toHaveClass(/past/);
  await expect(page.locator('.falling-event-slot[data-start="6"]')).toHaveCount(1);

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
  await expect(page.locator('.lyric-syllable[aria-current="true"]')).toHaveCount(1);

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
  await page.getByTestId('loop-drawer').locator('summary').click();
  await page.getByTestId('loop-enabled').check();
  await position.fill('7.8');
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
  await expect(page.getByTestId('practice-settings-status')).toContainText('4 Takte');
  await expect(page.getByTestId('practice-settings-status')).toContainText('Metronom');
  await expect(page.getByTestId('practice-settings-status')).toContainText('Begleitung aus');
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
  await page.getByTestId('loop-end-bar').selectOption('12');

  const lastScoreEntry = scoreEntries.last();
  await lastScoreEntry.click();
  await expect(position).toHaveValue('46');

  await page.reload();
  await expect(page.getByTestId('player-title')).toHaveText('Twinkle, Twinkle, Little Star');
  await expect(page.getByTestId('view-flow')).toHaveAttribute('aria-pressed', 'true');
  await openPracticeSettings(page);
  await expect(page.getByTestId('loop-enabled')).not.toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'issue-45-sentinel',
  );

  await expect(page.getByTestId('back-to-editor')).toBeVisible();
  await page.getByTestId('back-to-editor').click();
  await expect(page.getByTestId('song-title')).toHaveValue('Twinkle, Twinkle, Little Star');
  await expect(page.getByTestId('song-title')).toBeFocused();
  await expect(page.locator('.song-line')).toHaveCount(6);
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('song-title').fill('Twinkle – gemeinsamer Teststand');
  await page.waitForTimeout(700);
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });
  await page.reload();
  await expect(page.getByTestId('song-title')).toHaveValue('Twinkle – gemeinsamer Teststand');
  await expect(page.locator('.song-line')).toHaveCount(6);
});

async function openPracticeSettings(page: import('@playwright/test').Page): Promise<void> {
  const settings = page.getByTestId('practice-settings');
  if (!(await settings.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await settings.locator(':scope > summary').click();
  }
}

test('keeps synchronized text and the 17-tine instrument usable on a narrow phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('song-file-input').setInputFiles(TWINKLE_FIXTURE);
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
  const overlapsFlow = lyrics!.y < flow!.y + flow!.height && lyrics!.y + lyrics!.height > flow!.y;
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

test('renders the canonical profile colors unchanged across editor and player surfaces', async ({
  page,
}) => {
  const targetColors = ['#2E7975', '#3CB8A6', '#A8DDBF', '#D41C33', '#F78853'];
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  for (const color of ['#2E7975', '#3CB8A6', '#D41C33', '#F78853']) {
    const sheetColorSurface = page.locator(`[data-profile-color="${color}"]`).first();
    await expect(sheetColorSurface).toBeVisible();
    expect(
      await sheetColorSurface.evaluate((element) => getComputedStyle(element).backgroundColor),
    ).toBe(hexToRgb(color));
  }
  await page.getByTestId('song-file-input').setInputFiles(TWINKLE_FIXTURE);
  await expect(page.getByTestId('sheet-track-0-0-melody')).toContainText('C · 1');
  await expect(page.getByTestId('sheet-track-0-0-accompaniment')).toContainText('E · 3 + G · 5');
  for (const color of ['#26562A', '#D41C33']) {
    const accompanimentSwatch = page
      .getByTestId('sheet-track-0-0-accompaniment')
      .locator(`.event-color-swatches [data-profile-color="${color}"]`);
    await expect(accompanimentSwatch).toBeVisible();
    expect(
      await accompanimentSwatch.evaluate((element) => getComputedStyle(element).backgroundColor),
    ).toBe(hexToRgb(color));
  }
  await page.getByTestId('word-card-0-0').click();

  for (const color of targetColors) {
    const key = page.locator(`.key-button[data-profile-color="${color}"]`);
    await expect(key).toHaveCount(1);
    expect(await key.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
      hexToRgb(color),
    );
  }
  const cEventStripe = page.locator('.event-color-strip [data-profile-color="#2E7975"]').first();
  await expect(cEventStripe).toBeVisible();
  expect(await cEventStripe.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
    hexToRgb('#2E7975'),
  );
  await page.getByTestId('word-card-0-1').click();
  const gEventStripe = page.locator('.event-color-strip [data-profile-color="#D41C33"]').first();
  await expect(gEventStripe).toBeVisible();
  expect(await gEventStripe.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
    hexToRgb('#D41C33'),
  );

  await page.getByTestId('open-player').click();
  await expect(page.getByTestId('color-aid')).toHaveValue('full');
  for (const color of targetColors) {
    const key = page.locator(`.kalimba-key[data-profile-color="${color}"]`).first();
    await expect(key).toBeVisible();
    expect(
      await key.evaluate((element) => getComputedStyle(element, '::before').backgroundColor),
    ).toBe(hexToRgb(color));
  }
  for (const color of ['#2E7975', '#D41C33']) {
    const flowEvent = page.locator(`.flow-event[data-profile-color="${color}"]`).first();
    await expect(flowEvent).toBeVisible();
    expect(await flowEvent.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
      hexToRgb(color),
    );

    const scoreEntry = page.locator(`.score-entry[data-profile-color="${color}"]`).first();
    await expect(scoreEntry).toBeVisible();
    expect(
      await scoreEntry.evaluate((element) => getComputedStyle(element).borderBottomColor),
    ).toBe(hexToRgb(color));
  }
});

test('starts Twinkle at full duration and applies a prepared range only after loop activation', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('song-file-input').setInputFiles(TWINKLE_FIXTURE);
  await page.getByTestId('word-card-0-0').click();
  await page.getByTestId('open-player').click();
  await openPracticeSettings(page);

  const loop = page.getByTestId('loop-enabled');
  const position = page.getByTestId('position');
  await expect(loop).not.toBeChecked();
  await expect(page.getByTestId('loop-summary')).toContainText('Schlag 1 bis 4');
  await expect(position).toHaveAttribute('min', '0');
  await expect(position).toHaveAttribute('max', '48');
  await expect(page.getByTestId('play-status')).toContainText('/ 0:40');

  await page.getByTestId('loop-drawer').locator('summary').click();
  await loop.check();
  await expect(loop).toBeChecked();
  await expect(position).toHaveAttribute('max', '4');
  await expect(page.getByTestId('play-status')).toContainText('/ 0:03');

  await loop.uncheck();
  await expect(loop).not.toBeChecked();
  await expect(position).toHaveAttribute('min', '0');
  await expect(position).toHaveAttribute('max', '48');
  await expect(page.getByTestId('play-status')).toContainText('/ 0:40');
});

test('keeps the player stable while only the bounded score follows later lines', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByTestId('edit-mode-toggle').click();
    await page.getByTestId('song-file-input').setInputFiles(TWINKLE_FIXTURE);
    await page.getByTestId('open-player').click();
    await expect(page.getByTestId('player-title')).toHaveText('Twinkle, Twinkle, Little Star');

    const shell = page.locator('.player-shell');
    const score = page.getByTestId('score-scroll');
    const scoreColumnCount = await score.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
    );
    expect(scoreColumnCount).toBe(viewport.width >= 1100 ? 2 : 1);
    const backToEditor = page.getByTestId('back-to-editor');
    await expect(backToEditor).toBeVisible();
    const backActionBox = await backToEditor.boundingBox();
    expect(backActionBox).not.toBeNull();
    expect(backActionBox!.y).toBeGreaterThanOrEqual(0);
    expect(backActionBox!.y + backActionBox!.height).toBeLessThanOrEqual(viewport.height);
    const shellTopBefore = await shell.evaluate((element) => element.getBoundingClientRect().top);
    const windowScrollBefore = await page.evaluate(() => scrollY);
    const scoreScrollBefore = await score.evaluate((element) => element.scrollTop);
    const laterEntry = page.getByTestId('score-line-4').locator('.score-entry').first();
    const laterBeat = Number(await laterEntry.getAttribute('data-start')) + 0.1;

    await page.locator('.player-heading').click({ position: { x: 6, y: 6 } });
    await page.getByTestId('position').evaluate((input: HTMLInputElement, value) => {
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, laterBeat);
    await expect(laterEntry).toHaveAttribute('aria-current', 'true');
    await expect
      .poll(() => score.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(scoreScrollBefore);

    expect(await page.evaluate(() => scrollY)).toBe(windowScrollBefore);
    expect(await shell.evaluate((element) => element.getBoundingClientRect().top)).toBeCloseTo(
      shellTopBefore,
      1,
    );

    await page
      .getByTestId('score-sheet')
      .evaluate((element) => element.scrollIntoView({ block: 'center' }));
    const clickWindowScrollBefore = await page.evaluate(() => scrollY);
    const clickShellTopBefore = await shell.evaluate(
      (element) => element.getBoundingClientRect().top,
    );
    await laterEntry.click();
    expect(await page.evaluate(() => scrollY)).toBe(clickWindowScrollBefore);
    expect(await shell.evaluate((element) => element.getBoundingClientRect().top)).toBeCloseTo(
      clickShellTopBefore,
      1,
    );

    await page.evaluate(() => scrollTo(0, 0));
    await backToEditor.click();
    await expect(page.getByTestId('song-title')).toHaveValue('Twinkle, Twinkle, Little Star');
    await expect(page.getByTestId('song-title')).toBeFocused();
  }
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
    const trackArea = document
      .querySelector<HTMLElement>('.flow-track-area')
      ?.getBoundingClientRect();
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

function hexToRgb(color: string): string {
  const value = Number.parseInt(color.slice(1), 16);
  return `rgb(${value >> 16}, ${(value >> 8) & 255}, ${value & 255})`;
}
