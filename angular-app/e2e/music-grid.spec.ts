import { expect, test } from '@playwright/test';

test('edits the canonical tracks by keyboard and keeps history, focus guards and reload fidelity', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-0').click();

  const grid = page.getByTestId('music-grid');
  const melody = page.getByTestId('music-grid-row-melody');
  const accompaniment = page.getByTestId('music-grid-row-accompaniment');
  await expect(grid).toBeVisible();
  await grid.focus();
  await grid.press('KeyB');
  await grid.press('KeyQ');
  await expect(melody.getByTestId('music-grid-event-melody-0')).toHaveCSS(
    'grid-column-end',
    'span 1',
  );

  await grid.press('ArrowDown');
  await grid.press('Alt+KeyH');
  await grid.press('KeyG');
  await grid.press('Enter');
  await expect(accompaniment.locator('.music-grid-event.is-chord')).toHaveCount(1);

  await page.getByTestId('undo-structure-editor').click();
  await expect(accompaniment.locator('.music-grid-event')).toHaveCount(0);
  await page.getByTestId('redo-structure-editor').click();
  await expect(accompaniment.locator('.music-grid-event.is-chord')).toHaveCount(1);

  const text = page.getByTestId('word-0-0');
  const musicBeforeTextInput = await melody.locator('.music-grid-event').count();
  await text.focus();
  await text.press('KeyQ');
  await expect(text).toHaveValue(/q$/i);
  await expect(melody.locator('.music-grid-event')).toHaveCount(musicBeforeTextInput);

  await grid.focus();
  await grid.press('Control+ArrowLeft');
  await grid.press('Shift+ArrowUp');
  const melodyCountBeforeSelectionDelete = await melody.locator('.music-grid-event').count();
  await grid.press('Delete');
  await expect(melody.locator('.music-grid-event')).toHaveCount(
    melodyCountBeforeSelectionDelete - 1,
  );
  await expect(accompaniment.locator('.music-grid-event')).toHaveCount(0);
  await page.getByTestId('undo-structure-editor').click();
  await expect(melody.locator('.music-grid-event')).toHaveCount(melodyCountBeforeSelectionDelete);
  await expect(accompaniment.locator('.music-grid-event.is-chord')).toHaveCount(1);

  await expect.poll(async () => page.locator('.save-state').textContent()).toContain('Gespeichert');
  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-0').click();
  await expect(
    page.getByTestId('music-grid-row-accompaniment').locator('.music-grid-event.is-chord'),
  ).toHaveCount(1);
});
