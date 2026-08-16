import { expect, test, type Locator, type Page } from '@playwright/test';
import { resolve } from 'node:path';

const SYNTHETIC_IMPORT_FIXTURE = resolve('e2e/fixtures/synthetic-structure-song.json');

test('keeps the mobile editor readable with page overflow contained to the key palette', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('word-card-0-0').tap();

  await expect(page.getByTestId('word-editor')).toBeVisible();
  await expectNoPageOverflow(page);
  await expectInsideViewport(page, page.getByTestId('word-editor'));
  await expectInsideViewport(page, page.getByTestId('word-0-0'));
  await expectInsideViewport(page, page.getByTestId('notation-0-0'));

  const keyPalette = page.getByTestId('key-palette');
  await expect(keyPalette).toBeVisible();
  expect(await keyPalette.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
    true,
  );
  expect(await keyPalette.evaluate((element) => getComputedStyle(element).overflowX)).toBe('auto');
});

test('selects ordered blocks by long press and touch, keeps the toolbar reachable and pastes safely', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kalimba-note-tool-v1', 'touch-user-sentinel'));
  await page.locator('input[type="file"]').setInputFiles(SYNTHETIC_IMPORT_FIXTURE);

  const sourceFirst = page.getByTestId('word-card-0-0');
  const sourceLast = page.getByTestId('word-card-0-2');
  await longPress(page, sourceFirst);
  await expect(page.getByTestId('word-editor')).toBeHidden();
  await sourceLast.tap();
  await expect(page.getByTestId('selection-count')).toHaveText('2 Blöcke ausgewählt');
  await expect(sourceFirst).toHaveAttribute('aria-pressed', 'true');
  await expect(sourceLast).toHaveAttribute('aria-pressed', 'true');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const toolbar = page.getByTestId('selection-toolbar');
  await expect(toolbar).toBeVisible();
  await expectInsideViewport(page, toolbar);
  const toolbarBox = await toolbar.boundingBox();
  expect(toolbarBox!.y).toBeGreaterThanOrEqual(0);
  expect(toolbarBox!.y + toolbarBox!.height).toBeLessThanOrEqual(
    await page.evaluate(() => innerHeight),
  );
  for (const testId of ['copy-selection', 'paste-selection', 'clear-selection']) {
    expect((await page.getByTestId(testId).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }

  await page.getByTestId('copy-selection').click();
  await expect(page.getByTestId('clipboard-count')).toHaveText('2 kopiert');
  await page.getByTestId('clear-selection').click();

  const targetFirst = page.getByTestId('word-card-1-0');
  const targetLast = page.getByTestId('word-card-1-1');
  await longPress(page, targetFirst);
  await targetLast.tap();
  await expect(page.getByTestId('selection-count')).toHaveText('2 Blöcke ausgewählt');
  await page.getByTestId('paste-selection').click();

  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });
  await page.getByTestId('clear-selection').click();
  await targetFirst.tap();
  await expect(page.getByTestId('notation-1-0')).toHaveValue('(13)');
  await page.getByRole('button', { name: 'Editor schließen' }).last().click();
  await targetLast.tap();
  await expect(page.getByTestId('notation-1-1')).toHaveValue('3′ - 4′ (2′5′) 1′');
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'touch-user-sentinel',
  );
  await expectNoPageOverflow(page);
});

async function longPress(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  const event = {
    pointerId: 17,
    pointerType: 'touch',
    isPrimary: true,
    clientX: box!.x + box!.width / 2,
    clientY: box!.y + box!.height / 2,
  };
  await locator.dispatchEvent('pointerdown', event);
  await page.waitForTimeout(550);
  await locator.dispatchEvent('pointerup', event);
  await locator.dispatchEvent('click', { pointerType: 'touch' });
}

async function expectNoPageOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
        document.body.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

async function expectInsideViewport(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
}
