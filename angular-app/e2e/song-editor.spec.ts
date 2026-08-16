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
  await page.reload();
  await expect(page.getByTestId('song-title')).toHaveValue('Reload Song äöü');
  await expect(page.getByTestId('word-0-0')).toHaveValue('Märchen');
  await expect(page.getByTestId('notation-0-0')).toHaveValue('(13) 5′-x(');
});
