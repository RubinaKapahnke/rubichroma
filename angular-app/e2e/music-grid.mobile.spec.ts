import { expect, test } from '@playwright/test';

test('keeps the focused music rows and contextual shortcut help usable at 390 px', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').tap();
  await page.getByTestId('word-card-0-0').tap();

  const editor = page.getByTestId('word-editor');
  const melody = page.getByTestId('track-row-melody');
  await melody.scrollIntoViewIfNeeded();
  await expect(melody).toBeVisible();
  await expect(melody.locator('.keyboard-track-status')).toContainText(
    'Aktive Spur: MelodiePosition: 1Notenwert: Viertel',
  );
  await expect(editor.locator('.keyboard-shortcuts-help')).not.toHaveAttribute('open', '');
  await expect(editor.locator('.reference-key-row').first()).not.toBeVisible();
  await editor.getByText('? Tastenkürzel').click();
  await expect(editor.getByText(/Notenwert-Kürzel – Notenlänge wählen:/)).toBeVisible();
  await expect(editor.locator('.reference-key-row')).toHaveCount(2);

  await melody.focus();
  await page.keyboard.press('Digit1');
  await expect(melody.locator('.event-chip')).not.toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
