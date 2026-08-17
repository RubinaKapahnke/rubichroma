import { expect, test } from '@playwright/test';

test('keeps the focused music grid and contextual shortcut help usable at 390 px', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').tap();
  await page.getByTestId('word-card-0-0').tap();

  const editor = page.getByTestId('word-editor');
  const grid = page.getByTestId('music-grid');
  await grid.scrollIntoViewIfNeeded();
  await expect(grid).toBeVisible();
  await expect(editor.getByText('Notenwert-Kürzel:')).toBeVisible();
  await editor.getByText('Kürzelhilfe fürs Raster').click();
  await expect(editor.getByText(/Notenlänge wählen mit Y\/X\/C\/V\/B/)).toBeVisible();
  await expect(editor.locator('.reference-key-row')).toHaveCount(2);

  await grid.focus();
  await grid.press('Digit1');
  await expect(
    page.getByTestId('music-grid-row-melody').locator('.music-grid-event'),
  ).not.toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
