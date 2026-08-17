import { expect, test, type Locator, type Page } from '@playwright/test';
import { resolve } from 'node:path';

const SYNTHETIC_IMPORT_FIXTURE = resolve('e2e/fixtures/synthetic-structure-song.json');

test('keeps the iOS-style editor sheet inside the dynamic viewport with a fixed close control', async ({
  page,
}) => {
  await page.goto('/');
  expect((await page.locator('.editor-card').boundingBox())!.y).toBeLessThanOrEqual(240);
  await page.getByTestId('word-card-0-0').tap();

  const editor = page.getByTestId('word-editor');
  const close = page.getByRole('button', { name: 'Editor schließen' });
  const content = page.locator('.word-editor-content');
  await expect(editor).toBeVisible();
  await expect(page.getByTestId('selection-toolbar')).toBeHidden();
  await expectInsideVisualViewport(page, editor);
  await expectInsideVisualViewport(page, close);
  await expectPageScrollLocked(page);
  await expectNoPageOverflow(page);
  expect((await page.locator('.topbar').boundingBox())!.height).toBeLessThanOrEqual(64);

  const closeTop = (await close.boundingBox())!.y;
  await content.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expectInsideVisualViewport(page, close);
  expect(Math.abs((await close.boundingBox())!.y - closeTop)).toBeLessThan(1);
  await expect(page.locator('main')).toHaveAttribute('inert', '');
  await expect(page.locator('.topbar')).toHaveAttribute('inert', '');

  const keyPalette = page.getByTestId('key-palette');
  await expect(keyPalette).toBeVisible();
  expect(await keyPalette.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
    true,
  );
  expect(await keyPalette.evaluate((element) => getComputedStyle(element).overflowX)).toBe('auto');
  const firstKey = keyPalette.locator('[data-testid^="key-"]').first();
  const lastKey = keyPalette.locator('[data-testid^="key-"]').last();
  await expectKeyInsidePalette(keyPalette, firstKey);
  await keyPalette.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await expectKeyInsidePalette(keyPalette, lastKey);
  await lastKey.tap();
  await expect(page.getByTestId('notation-0-0')).not.toHaveValue('1 2 3 (135)');

  const viewport = page.viewportSize();
  await page.setViewportSize({
    width: viewport!.width,
    height: Math.max(560, viewport!.height - 120),
  });
  await expectInsideVisualViewport(page, editor);
  await expectInsideVisualViewport(page, close);
  await page.setViewportSize(viewport!);

  await close.tap();
  await expect(editor).toBeHidden();
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  await expectPageScrollUnlocked(page);
});

test('latches ordered touch selection, keeps a compact bottom action bar and pastes safely', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('kalimba-note-tool-v1', 'touch-user-sentinel'));
  await page.locator('input[type="file"]').setInputFiles(SYNTHETIC_IMPORT_FIXTURE);

  const sourceFirst = page.getByTestId('word-card-0-0');
  const sourceLast = page.getByTestId('word-card-0-2');
  await longPress(page, sourceFirst);
  await expect(page.getByTestId('word-editor')).toBeHidden();

  // Deliberately emit a plain compatibility click without touch metadata. The parent mode stays latched.
  await sourceLast.dispatchEvent('click');
  await expect(page.getByTestId('selection-count')).toHaveText('2 Blöcke ausgewählt');
  await expect(sourceFirst).toHaveAttribute('aria-pressed', 'true');
  await expect(sourceLast).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('word-editor')).toBeHidden();

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const toolbar = page.getByTestId('selection-toolbar');
  await expect(toolbar).toBeVisible();
  await expectCompactBottomToolbar(page, toolbar);
  for (const testId of ['copy-selection', 'paste-selection', 'clear-selection']) {
    expect((await page.getByTestId(testId).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await expectNoPageOverflow(page);

  await page.getByTestId('copy-selection').tap();
  await expect(page.getByTestId('clipboard-count')).toHaveText('2 kopiert');
  await page.getByTestId('clear-selection').tap();
  await expect(toolbar).toBeHidden();

  await page.getByTestId('start-multi-selection').tap();
  await expect(page.getByTestId('selection-count')).toHaveText('0 Blöcke ausgewählt');
  const targetFirst = page.getByTestId('word-card-1-0');
  const targetLast = page.getByTestId('word-card-1-1');
  await targetFirst.tap();
  await targetLast.tap();
  await expect(page.getByTestId('selection-count')).toHaveText('2 Blöcke ausgewählt');
  await expect(page.getByTestId('word-editor')).toBeHidden();
  await page.getByTestId('paste-selection').tap();

  await expect(page.locator('.save-state')).toHaveAttribute('data-status', 'saved', {
    timeout: 5_000,
  });
  await page.getByTestId('clear-selection').tap();
  await targetFirst.tap();
  await expect(page.getByTestId('notation-1-0')).toHaveValue('(13)');
  await page.getByRole('button', { name: 'Editor schließen' }).tap();
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
        document.body.scrollWidth <= document.documentElement.clientWidth &&
        document.documentElement.scrollLeft === 0 &&
        document.body.scrollLeft === 0,
    ),
  ).toBe(true);
}

async function expectInsideVisualViewport(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  const viewport = await page.evaluate(() => ({
    left: window.visualViewport?.offsetLeft ?? 0,
    top: window.visualViewport?.offsetTop ?? 0,
    width: window.visualViewport?.width ?? innerWidth,
    height: window.visualViewport?.height ?? innerHeight,
  }));
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(viewport.left - 1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.left + viewport.width + 1);
  expect(box!.y).toBeGreaterThanOrEqual(viewport.top - 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.top + viewport.height + 1);
}

async function expectCompactBottomToolbar(page: Page, toolbar: Locator): Promise<void> {
  const box = await toolbar.boundingBox();
  const viewport = await page.evaluate(() => ({
    top: window.visualViewport?.offsetTop ?? 0,
    height: window.visualViewport?.height ?? innerHeight,
  }));
  expect(box).not.toBeNull();
  expect(box!.height).toBeLessThanOrEqual(160);
  expect(box!.height).toBeLessThanOrEqual(viewport.height * 0.25 + 1);
  expect(box!.y).toBeGreaterThanOrEqual(viewport.top);
  expect(viewport.top + viewport.height - (box!.y + box!.height)).toBeLessThanOrEqual(40);
}

async function expectKeyInsidePalette(palette: Locator, key: Locator): Promise<void> {
  const paletteBox = await palette.boundingBox();
  const keyBox = await key.boundingBox();
  expect(paletteBox).not.toBeNull();
  expect(keyBox).not.toBeNull();
  expect(keyBox!.x).toBeGreaterThanOrEqual(paletteBox!.x - 1);
  expect(keyBox!.x + keyBox!.width).toBeLessThanOrEqual(paletteBox!.x + paletteBox!.width + 1);
}

async function expectPageScrollLocked(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.classList.contains('cdk-global-scrollblock')),
    )
    .toBe(true);
}

async function expectPageScrollUnlocked(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.classList.contains('cdk-global-scrollblock')),
    )
    .toBe(false);
}
