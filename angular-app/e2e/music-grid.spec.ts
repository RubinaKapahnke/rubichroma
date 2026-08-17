import { expect, test } from '@playwright/test';

test('edits the canonical tracks by keyboard and keeps history, focus guards and reload fidelity', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-0').click();

  const melody = page.getByTestId('track-row-melody');
  const accompaniment = page.getByTestId('track-row-accompaniment');
  await expect(melody).toBeVisible();
  await melody.focus();
  await page.keyboard.press('KeyB');
  await page.keyboard.press('KeyQ');
  await expect(melody.locator('.event-chip').first()).toHaveAttribute(
    'data-duration-beats',
    '0.25',
  );

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Alt+KeyH');
  await expect(accompaniment.locator('.keyboard-chord-status')).toContainText('Enter bestätigen');
  await page.keyboard.press('KeyG');
  await page.keyboard.press('Enter');
  await expect(accompaniment.locator('.event-chip').filter({ hasText: 'Akkord' })).toHaveCount(1);

  await page.getByTestId('undo-structure-editor').click();
  await expect(accompaniment.locator('.event-chip')).toHaveCount(0);
  await page.getByTestId('redo-structure-editor').click();
  await expect(accompaniment.locator('.event-chip').filter({ hasText: 'Akkord' })).toHaveCount(1);

  const text = page.getByTestId('word-0-0');
  const musicBeforeTextInput = await melody.locator('.event-chip').count();
  await text.focus();
  await text.press('KeyQ');
  await expect(text).toHaveValue(/q$/i);
  await expect(melody.locator('.event-chip')).toHaveCount(musicBeforeTextInput);

  await accompaniment.focus();
  await page.keyboard.press('Control+ArrowLeft');
  await page.keyboard.press('Shift+ArrowUp');
  const melodyCountBeforeSelectionDelete = await melody.locator('.event-chip').count();
  await page.keyboard.press('Delete');
  await expect(melody.locator('.event-chip')).toHaveCount(melodyCountBeforeSelectionDelete - 1);
  await expect(accompaniment.locator('.event-chip')).toHaveCount(0);
  await page.getByTestId('undo-structure-editor').click();
  await expect(melody.locator('.event-chip')).toHaveCount(melodyCountBeforeSelectionDelete);
  await expect(accompaniment.locator('.event-chip').filter({ hasText: 'Akkord' })).toHaveCount(1);

  await expect.poll(async () => page.locator('.save-state').textContent()).toContain('Gespeichert');
  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-0').click();
  await expect(
    page
      .getByTestId('track-row-accompaniment')
      .locator('.event-chip')
      .filter({ hasText: 'Akkord' }),
  ).toHaveCount(1);
});
