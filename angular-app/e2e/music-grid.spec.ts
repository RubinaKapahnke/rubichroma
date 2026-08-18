import { expect, test } from '@playwright/test';

test('edits the canonical tracks by keyboard and keeps history, focus guards and reload fidelity', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();

  const editorLayout = page.locator('.editor-layout');
  const songSheet = page.locator('app-song-sheet');
  const widthBeforeSelection = await songSheet.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  await expect
    .poll(async () => {
      const layoutWidth = await editorLayout.evaluate(
        (element) => element.getBoundingClientRect().width,
      );
      const sheetWidth = await songSheet.evaluate(
        (element) => element.getBoundingClientRect().width,
      );
      return Math.abs(layoutWidth - sheetWidth);
    })
    .toBeLessThanOrEqual(1);
  await expect
    .poll(async () => {
      const words = page.locator('.song-line').first().locator('.text-timeline');
      const [wordsBox, firstBox, lastBox] = await Promise.all([
        words.boundingBox(),
        words.locator('.word-card-shell').first().boundingBox(),
        words.locator('.word-card-shell').last().boundingBox(),
      ]);
      if (!wordsBox || !firstBox || !lastBox) return Number.POSITIVE_INFINITY;
      return Math.max(
        Math.abs(wordsBox.x - firstBox.x),
        Math.abs(wordsBox.x + wordsBox.width - (lastBox.x + lastBox.width)),
      );
    })
    .toBeLessThanOrEqual(1);

  await page.getByTestId('word-card-0-0').click();
  await expect(page.getByTestId('inline-word-editor-0')).toBeVisible();
  await expect
    .poll(async () => {
      const sheetWidth = await songSheet.evaluate(
        (element) => element.getBoundingClientRect().width,
      );
      return Math.abs(widthBeforeSelection - sheetWidth);
    })
    .toBeLessThanOrEqual(1);

  const melody = page.getByTestId('track-row-melody');
  const accompaniment = page.getByTestId('track-row-accompaniment');
  await expect(melody).toBeVisible();
  await melody.focus();
  await page.keyboard.press('KeyM');
  await page.keyboard.press('KeyQ');
  await expect(melody.locator('.event-chip').first()).toHaveAttribute(
    'data-duration-beats',
    '0.25',
  );

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Alt+KeyQ');
  await expect(accompaniment.locator('.keyboard-chord-status')).toContainText('Enter bestätigen');
  await page.keyboard.press('KeyP');
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
  const melodyCountBeforeSelectionDelete = await melody
    .locator('.event-chip:not(.is-rest)')
    .count();
  await page.keyboard.press('Delete');
  await expect(melody.locator('.event-chip:not(.is-rest)')).toHaveCount(
    melodyCountBeforeSelectionDelete - 1,
  );
  await expect(accompaniment.locator('.event-chip:not(.is-rest)')).toHaveCount(1);
  await expect(accompaniment.locator('.event-chip.is-rest')).toHaveCount(1);
  await page.getByTestId('undo-structure-editor').click();
  await expect(melody.locator('.event-chip:not(.is-rest)')).toHaveCount(
    melodyCountBeforeSelectionDelete,
  );
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

test('edits existing notes and chords in place with pointer input and document history', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-0').click();

  const melody = page.getByTestId('track-row-melody');
  const firstEvent = melody.locator('.event-chip').first();
  const originalLabel = await firstEvent.locator('.event-select-action strong').textContent();
  const originalDuration = await firstEvent.getAttribute('data-duration-beats');
  await firstEvent.locator('.event-select-action').click();
  await expect(firstEvent).toHaveClass(/is-selected/);
  await page.getByTestId('key-9-3-0').click();
  await expect(firstEvent.locator('.event-select-action strong')).not.toHaveText(originalLabel!);
  const replacementLabel = await firstEvent.locator('.event-select-action strong').textContent();
  await expect(firstEvent).toHaveAttribute('data-duration-beats', originalDuration!);

  await page.getByTestId('undo-structure-editor').click();
  await expect(firstEvent.locator('.event-select-action strong')).toHaveText(originalLabel!);
  await page.getByTestId('redo-structure-editor').click();
  await expect(firstEvent.locator('.event-select-action strong')).toHaveText(replacementLabel!);

  const eventCountBeforeInsert = await melody.locator('.event-chip').count();
  await melody.focus();
  await page.keyboard.press('Control+ArrowRight');
  await page.locator('.key-button').last().click();
  await expect(melody.locator('.event-chip')).toHaveCount(eventCountBeforeInsert + 1);

  const chord = melody.locator('.event-chip').filter({ hasText: 'Akkord' }).first();
  const chordLabelBefore = await chord.locator('.event-select-action strong').textContent();
  const chordDuration = await chord.getAttribute('data-duration-beats');
  await chord.locator('.event-select-action').click();
  await page.locator('.key-button').last().click();
  await page.getByRole('button', { name: 'Akkord aktualisieren' }).click();
  await expect(melody.locator('.event-chip').filter({ hasText: 'Akkord' })).toHaveCount(1);
  await expect(chord).toHaveAttribute('data-duration-beats', chordDuration!);
  const chordLabelAfter = await chord.locator('.event-select-action strong').textContent();
  expect(chordLabelAfter).not.toBe(chordLabelBefore);

  await expect.poll(async () => page.locator('.save-state').textContent()).toContain('Gespeichert');
  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-0').click();
  const reloadedMelody = page.getByTestId('track-row-melody');
  await expect(reloadedMelody.locator('.event-chip')).toHaveCount(eventCountBeforeInsert + 1);
  await expect(reloadedMelody.locator('.event-chip').first()).toContainText(replacementLabel!);
  await expect(
    reloadedMelody.locator('.event-chip').filter({ hasText: chordLabelAfter! }),
  ).toHaveCount(1);
});

test('persists an exact later sixteenth position and shares a 6/8 bar contract', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('time-signature-numerator').selectOption('3');
  await page.getByTestId('time-signature-denominator').selectOption('4');
  await expect
    .poll(() =>
      page
        .getByTestId('song-melody-row-0')
        .evaluate((element) => [
          (element as HTMLElement).style.getPropertyValue('--bar-slots'),
          (element as HTMLElement).style.getPropertyValue('--pulse-slots'),
        ]),
    )
    .toEqual(['12', '4']);
  await page.getByTestId('time-signature-numerator').selectOption('6');
  await page.getByTestId('time-signature-denominator').selectOption('8');
  await expect
    .poll(() =>
      page
        .getByTestId('song-melody-row-0')
        .evaluate((element) => [
          (element as HTMLElement).style.getPropertyValue('--bar-slots'),
          (element as HTMLElement).style.getPropertyValue('--pulse-slots'),
        ]),
    )
    .toEqual(['12', '2']);
  await page.getByTestId('word-card-0-0').click();

  const melody = page.getByTestId('track-row-melody');
  await melody.focus();
  await page.keyboard.press('Control+ArrowRight');
  for (let index = 0; index < 5; index += 1) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('KeyM');
  await page.keyboard.press('Digit1');

  const rests = melody.locator('.event-chip.is-rest');
  await expect(rests).toHaveCount(1);
  await expect(rests).toHaveAttribute('data-duration-beats', '0.25');
  await expect(rests).toHaveAttribute('data-start-slot', '16');
  await expect(melody.locator('.event-chip:not(.is-rest)').last()).toHaveAttribute(
    'data-duration-beats',
    '0.25',
  );
  await expect(melody.locator('.event-chip:not(.is-rest)').last()).toHaveAttribute(
    'data-start-slot',
    '17',
  );
  await expect(page.getByTestId('song-melody-row-0')).toHaveCSS(
    'background-image',
    /linear-gradient/,
  );

  await expect.poll(async () => page.locator('.save-state').textContent()).toContain('Gespeichert');
  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('time-signature-numerator')).toHaveValue('6');
  await expect(page.getByTestId('time-signature-denominator')).toHaveValue('8');
  await page.getByTestId('word-card-0-0').click();
  await expect(page.getByTestId('track-row-melody').locator('.event-chip.is-rest')).toHaveAttribute(
    'data-duration-beats',
    '0.25',
  );
});
