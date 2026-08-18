import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { THEME_STORAGE_KEY } from '../src/app/infrastructure/theme-preference';

const SYNTHETIC_IMPORT_FIXTURE = resolve('e2e/fixtures/synthetic-structure-song.json');
const TWINKLE_IMPORT_FIXTURE = resolve(
  'src/app/infrastructure/persistence/twinkle-twinkle-little-star.json',
);

test('starts in a calm full-width view and opens editing context only on request', async ({
  page,
}) => {
  await page.goto('/');

  const title = page.getByTestId('song-title');
  const sheet = page.locator('app-song-sheet');
  const layout = page.locator('.editor-layout');
  await expect(title).toBeVisible();
  await expect(title).toHaveAttribute('readonly', '');
  await expect(page.getByTestId('edit-mode-toggle')).toHaveText('Bearbeiten');
  await expect(page.getByTestId('add-song-block')).toHaveCount(0);
  await expect(page.getByTestId('line-drag-handle-0')).toHaveCount(0);
  await expect(page.getByTestId('word-preview-0-0')).toHaveCount(0);
  const layoutBox = await layout.boundingBox();
  const sheetBox = await sheet.boundingBox();
  expect(layoutBox).not.toBeNull();
  expect(sheetBox).not.toBeNull();
  expect(Math.abs(layoutBox!.width - sheetBox!.width)).toBeLessThanOrEqual(2);

  await page.getByTestId('edit-mode-toggle').click();
  await expect(title).not.toHaveAttribute('readonly');
  await expect(page.getByTestId('add-song-block')).toBeVisible();
  await page.getByTestId('word-card-0-0').click();
  await expect(page.getByTestId('inline-word-editor-0')).toBeVisible();
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('inline-word-editor-0')).toHaveCount(0);
  await expect(page.getByTestId('edit-mode-toggle')).toBeFocused();
  await expect(title).toHaveAttribute('readonly', '');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByTestId('open-player')).toBeVisible();
  await expect(page.getByTestId('edit-mode-toggle')).toBeVisible();
  await expectNoPageOverflow(page);
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-0').click();
  await expect(page.getByTestId('word-editor')).toBeVisible();
  await page.getByRole('button', { name: 'Editor schließen' }).click();
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('word-editor')).toHaveCount(0);
  await expectNoPageOverflow(page);
});

test('renders an imported multi-line song immediately, then supports structure undo and reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('word-card-0-0')).toContainText('Willkommen');

  await page.getByTestId('song-file-input').setInputFiles(SYNTHETIC_IMPORT_FIXTURE);

  await expect(page.getByTestId('song-title')).toHaveValue('Prüflied ÄÖÜ – drei Zeilen');
  await expect(page.locator('.song-line')).toHaveCount(3);
  await expect(page.getByTestId('word-card-0-0')).toContainText('Grüße –');
  await expect(page.getByTestId('word-card-0-2')).toContainText('Textloser Abschnitt');
  await expect(page.getByTestId('word-card-2-0')).toContainText('Schluss');
  await expect(page.getByText('Willkommen')).toHaveCount(0);

  const importedUnknownFields = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('kalimba-angular-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<Record<string, unknown>>((resolve, reject) => {
        const transaction = database.transaction(['meta', 'songs']);
        const currentRequest = transaction.objectStore('meta').get('current-song-id');
        currentRequest.onsuccess = () => {
          const request = transaction.objectStore('songs').get(currentRequest.result.value);
          request.onsuccess = () => {
            const document = request.result.document;
            resolve({
              root: document.extra.unknownRoot,
              song: document.song.extra.unknownSongField,
              line: document.song.lines[0].extra.unknownLineField,
              word: document.song.lines[0].words[0].extra.unknownWordField,
              melodyText: document.song.lines[0].words[2].text,
              key: document.keys[0].unknownKeyField,
            });
          };
          request.onerror = () => reject(request.error);
        };
        currentRequest.onerror = () => reject(currentRequest.error);
      });
    } finally {
      database.close();
    }
  });
  expect(importedUnknownFields).toEqual({
    root: { mustSurvive: true },
    song: 'bleibt erhalten',
    line: 'Strophe A',
    word: ['bleibt', 1],
    melodyText: '♪',
    key: 0,
  });

  const importRoundtripDownload = page.waitForEvent('download');
  await openDocumentMenu(page);
  await page.getByTestId('export-button').click();
  const importRoundtrip = JSON.parse(
    await readFile((await (await importRoundtripDownload).path())!, 'utf8'),
  ) as Record<string, any>;
  expect(importRoundtrip['song']['lines'][0]['words'][2]['text']).toBe('♪');
  expect(importRoundtrip['unknownRoot']).toEqual({ mustSurvive: true });

  await page.getByTestId('word-card-0-0').click();
  await openBlockActions(page);
  await page.getByTestId('block-duplicate').click();
  await expect(page.locator('[data-testid^="word-card-0-"]')).toHaveCount(4);
  await page.getByTestId('undo-structure').click();
  await expect(page.locator('[data-testid^="word-card-0-"]')).toHaveCount(3);
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });

  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('song-title')).toHaveValue('Prüflied ÄÖÜ – drei Zeilen');
  await expect(page.locator('.song-line')).toHaveCount(3);
  await expect(page.getByTestId('word-card-0-0')).toContainText('Grüße –');
  await expect(page.getByTestId('word-card-0-2')).toContainText('Textloser Abschnitt');
  await expect(page.getByTestId('word-card-2-0')).toContainText('Schluss');
  await expect(page.getByTestId('undo-structure')).toBeDisabled();
  await expect(page.getByTestId('redo-structure')).toBeDisabled();
});

test('exports, previews and atomically restores a full local backup', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('edit-mode-toggle')).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem('kalimba-note-tool-v1', 'legacy-backup-byte-sentinel'),
  );
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('song-file-input').setInputFiles(SYNTHETIC_IMPORT_FIXTURE);
  await expect(page.getByTestId('song-title')).toHaveValue('Prüflied ÄÖÜ – drei Zeilen');
  await expect(page.locator('.save-state')).toHaveAttribute('data-status', 'saved', {
    timeout: 5_000,
  });

  const downloadPromise = page.waitForEvent('download');
  await openDocumentMenu(page);
  await page.getByTestId('backup-export-button').click();
  const backupBuffer = await readFile((await (await downloadPromise).path())!);
  const backup = JSON.parse(backupBuffer.toString('utf8')) as Record<string, any>;
  expect(backup).toMatchObject({ kind: 'rubichroma-local-backup', formatVersion: 3 });
  expect(backup['storage']['songs'][0]['id']).toMatch(/^song-/);
  expect(backup['storage']['songs'][0]['createdAt']).toEqual(expect.any(String));
  expect(backup['storage']['songs'][0]['revision']).toBeGreaterThan(0);
  expect(
    backup['storage']['songs'][0]['document']['song']['lines'][0]['words'][0]['extra'][
      'unknownWordField'
    ],
  ).toEqual(['bleibt', 1]);
  expect(backup['storage']['songs'][0]['document']['keys']).toHaveLength(17);

  await page.getByTestId('song-title').fill('Temporärer Stand');
  await expect(page.locator('.save-state')).toHaveAttribute('data-status', 'saved', {
    timeout: 5_000,
  });
  const futureBackup = structuredClone(backup);
  futureBackup['formatVersion'] = 4;
  await page.getByTestId('backup-file-input').setInputFiles({
    name: 'future-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(futureBackup)),
  });
  await expect(page.getByTestId('restore-preview')).toHaveCount(0);
  await expect(page.locator('.error')).toContainText('Sicherungsversion');
  await expect(page.getByTestId('song-title')).toHaveValue('Temporärer Stand');
  await page.reload();
  await expect(page.getByTestId('song-title')).toHaveValue('Temporärer Stand');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('backup-file-input').setInputFiles({
    name: 'rubichroma-sicherung.json',
    mimeType: 'application/json',
    buffer: backupBuffer,
  });
  await expect(page.getByTestId('restore-preview')).toContainText('Prüflied ÄÖÜ – drei Zeilen');
  await expect(page.getByTestId('restore-preview')).toContainText(
    'Importiere dieses Lied als unabhängigen neuen Bibliothekseintrag',
  );
  await expect(page.getByTestId('song-title')).toHaveValue('Temporärer Stand');
  await expectNoPageOverflow(page);
  await page.getByTestId('backup-restore-cancel').click();
  await expect(page.getByTestId('restore-preview')).toHaveCount(0);
  await expect(page.getByTestId('song-title')).toHaveValue('Temporärer Stand');
  await page.getByTestId('backup-file-input').setInputFiles({
    name: 'rubichroma-sicherung.json',
    mimeType: 'application/json',
    buffer: backupBuffer,
  });
  await page.getByTestId('backup-restore-confirm').click();
  await expect(page.getByTestId('song-title')).toHaveValue('Prüflied ÄÖÜ – drei Zeilen');
  await expect(page.locator('.song-line')).toHaveCount(3);

  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-0').click();
  await page.getByTestId('word-0-0').fill('Nach Restore');
  await expect(page.locator('.save-state')).toHaveAttribute('data-status', 'saved', {
    timeout: 5_000,
  });
  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('word-card-0-0')).toContainText('Nach Restore');
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'legacy-backup-byte-sentinel',
  );
  await expectNoPageOverflow(page);
});

test('imports a validated backup repeatedly as independent new library songs', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('song-file-input').setInputFiles(SYNTHETIC_IMPORT_FIXTURE);
  await expect(page.getByTestId('song-title')).toHaveValue('Prüflied ÄÖÜ – drei Zeilen');
  await expect(page.locator('.save-state')).toHaveAttribute('data-status', 'saved', {
    timeout: 5_000,
  });
  const originalId = (await readLibraryState(page)).currentId;

  const downloadPromise = page.waitForEvent('download');
  await openDocumentMenu(page);
  await page.getByTestId('backup-export-button').click();
  const backupBuffer = await readFile((await (await downloadPromise).path())!);

  await page.getByTestId('song-title').fill('Bisheriger Song bleibt erhalten');
  await expect(page.locator('.save-state')).toHaveAttribute('data-status', 'saved', {
    timeout: 5_000,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('backup-file-input').setInputFiles({
    name: 'rubichroma-sicherung.json',
    mimeType: 'application/json',
    buffer: backupBuffer,
  });
  await expect(page.getByTestId('restore-preview')).toContainText('Prüflied ÄÖÜ – drei Zeilen');
  await expect(page.getByTestId('backup-import-new-confirm')).toHaveText(
    'Als neuen Song importieren',
  );
  await expect(page.getByTestId('song-title')).toHaveValue('Bisheriger Song bleibt erhalten');
  await expectNoPageOverflow(page);
  await page.getByTestId('backup-restore-cancel').click();
  await expect(page.getByTestId('restore-preview')).toHaveCount(0);

  await page.getByTestId('backup-file-input').setInputFiles({
    name: 'rubichroma-sicherung.json',
    mimeType: 'application/json',
    buffer: backupBuffer,
  });
  await page.getByTestId('backup-import-new-confirm').click();
  await expect(page.getByTestId('song-library')).toBeVisible();
  await page.locator('.document-more-actions > summary').click();
  await expect(page.locator('.song-library-entry')).toHaveCount(4);
  await expect(page.locator('.song-library-entry.is-current')).toContainText(
    'Prüflied ÄÖÜ – drei Zeilen',
  );

  const firstImportState = await readLibraryState(page);
  const firstImportId = firstImportState.currentId;
  const original = firstImportState.songs.find((song) => song.id === originalId);
  const imported = firstImportState.songs.find((song) => song.id === firstImportId);
  expect(original?.document.song.title).toBe('Bisheriger Song bleibt erhalten');
  expect(imported?.createdAt).toBe(imported?.updatedAt);
  expect(imported?.document.extra['unknownRoot']).toEqual({ mustSurvive: true });
  expect(firstImportId).not.toBe(originalId);

  await page.getByTestId('backup-file-input').setInputFiles({
    name: 'rubichroma-sicherung.json',
    mimeType: 'application/json',
    buffer: backupBuffer,
  });
  await page.getByTestId('backup-import-new-confirm').click();
  await expect(page.locator('.song-library-entry')).toHaveCount(5);
  const secondImportId = (await readLibraryState(page)).currentId;
  expect(new Set([originalId, firstImportId, secondImportId]).size).toBe(3);

  await page.getByTestId('close-library').click();
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('song-title').fill('Import mit Folgeänderung');
  await expect(page.locator('.save-state')).toHaveAttribute('data-status', 'saved', {
    timeout: 5_000,
  });
  await page.reload();
  await expect(page.getByTestId('song-title')).toHaveValue('Import mit Folgeänderung');
  await expectNoPageOverflow(page);
});

test('keeps frequent previews direct and destructive line actions secondary', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();

  await expect(page.getByTestId('sheet-intro')).toContainText('Einen Block auswählen');
  await expect(page.getByTestId('add-song-block')).toHaveText(/Block am Liedende hinzufügen/);
  await expect(page.getByTestId('line-preview-0')).toBeVisible();
  await expect(page.getByTestId('line-preview-0')).toHaveAttribute(
    'data-tooltip',
    'Zeile vorhören',
  );
  await page.getByTestId('line-preview-0').focus();
  await expect
    .poll(() =>
      page
        .getByTestId('line-preview-0')
        .evaluate((element) => getComputedStyle(element, '::after').opacity),
    )
    .toBe('1');
  await openLineActions(page, 0);
  await expect(page.getByTestId('line-duplicate-0')).toBeVisible();
  await expect(page.getByTestId('line-delete-0')).toBeDisabled();
  await page.getByTestId('add-song-block').click();

  await expect(page.locator('[data-testid^="word-card-0-"]')).toHaveCount(3);
  await expect(page.getByTestId('word-0-2')).toHaveValue('Neues Wort');
  await expect(page.getByText('Nächsten Liedblock anlegen')).toBeHidden();
  await expect(page.getByTestId('block-duplicate')).toBeHidden();

  await openLineActions(page, 0);
  await page.getByTestId('line-add-0').click();
  const gutterPositions = await page
    .locator('.line-number')
    .evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().x)),
    );
  expect(new Set(gutterPositions).size).toBe(1);

  await page.setViewportSize({ width: 390, height: 844 });
  const linePreviewBox = await page.getByTestId('line-preview-0').boundingBox();
  expect(linePreviewBox!.width).toBeGreaterThanOrEqual(44);
  expect(linePreviewBox!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('switches the inspector directly and dismisses it outside or with Escape', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-0').click();
  await expect(page.getByTestId('word-editor')).toBeVisible();
  await page.getByTestId('word-card-0-1').click();
  await expect(page.getByTestId('word-editor')).toContainText('Block 2');
  await page.getByText('Musikereignisse', { exact: true }).click();
  await expect(page.getByTestId('word-editor')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('word-editor')).toBeHidden();

  await page.getByTestId('word-card-0-0').click();
  await page.locator('.song-line').click({ position: { x: 4, y: 4 } });
  await expect(page.getByTestId('word-editor')).toBeHidden();

  await page.getByTestId('word-card-0-0').click();
  await openBlockManagement(page);
  const blockActions = page.getByTestId('more-block-actions');
  const blockToggle = blockActions.locator(':scope > summary');
  await blockToggle.click();
  await expect(blockToggle).toHaveAttribute('aria-expanded', 'true');
  await page.getByText('Musikereignisse', { exact: true }).click();
  await expect(blockActions).toHaveJSProperty('open', false);
  await blockToggle.click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('word-editor')).toBeHidden();
});

test('keeps help preference, product labels and song storage separate', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('song-title')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('kalimba-note-tool-v1', 'help-song-sentinel'));

  await expect(page.getByTestId('import-button')).toHaveText('Song-Datei laden');
  await expect(page.getByTestId('export-button')).toHaveText('Song-Datei exportieren');
  await expect(
    page.getByText(/Dein Song wird nur in diesem Browser gespeichert.*nicht in eine Cloud/),
  ).toBeVisible();
  await openLineActions(page, 0);
  await expect(page.getByTestId('line-add-0')).toHaveAccessibleName(/Zeile nach Zeile 1/);
  await expect(page.getByTestId('line-add-0')).toHaveAttribute('title', 'Zeile danach einfügen');
  await expect(page.getByTestId('undo-structure')).toHaveAttribute('title', /Strg\+Z/);
  await expect(page.getByTestId('redo-structure')).toHaveAttribute('title', /Strg\+Y/);

  await page.getByTestId('dismiss-structure-help').click();
  await expect(page.getByTestId('show-structure-help')).toBeVisible();
  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('sheet-intro')).toBeHidden();
  await expect(page.getByTestId('show-structure-help')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'help-song-sentinel',
  );
  await page.getByTestId('show-structure-help').click();
  await expect(page.getByTestId('sheet-intro')).toBeVisible();
});

test('keeps melody identity separate from optional text across autosave and reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-1').click();
  await expect(page.getByTestId('melody-block-marker')).toHaveText(/♪.*Instrumentalabschnitt/);
  await expect(page.getByTestId('word-0-1')).toHaveValue('');
  await expect(page.getByTestId('event-count')).toHaveText('4 Ereignisse');
  expect(await readStoredWord(page, 0, 1)).toMatchObject({ text: '♪', toneCount: 3 });

  await page.getByTestId('word-0-1').fill('Zwischenspiel');
  await page.getByTestId('word-0-1').fill('');
  await expect(page.locator('.save-state')).toHaveAttribute('data-status', 'saved', {
    timeout: 5_000,
  });
  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-1').click();
  await expect(page.getByTestId('melody-block-marker')).toBeVisible();
  await expect(page.getByTestId('word-0-1')).toHaveValue('');
  expect(await readStoredWord(page, 0, 1)).toMatchObject({
    text: '',
    toneCount: 3,
    melodyEvents: expect.arrayContaining([expect.objectContaining({ kind: 'note' })]),
  });

  await openBlockManagement(page);
  await page.getByTestId('block-add-melody').click();
  await expect(page.getByTestId('melody-block-marker')).toBeVisible();
  await expect(page.getByTestId('word-0-2')).toHaveValue('');
  await page.getByTestId('undo-structure-editor').click();
  await expect(page.locator('[data-testid^="word-card-0-"]')).toHaveCount(2);
  await page.getByTestId('redo-structure-editor').click();
  await expect(page.locator('[data-testid^="word-card-0-"]')).toHaveCount(3);
  await expect(page.getByTestId('melody-block-marker')).toBeVisible();
  await page.getByTestId('key-8-1-0').click();
  await expect(page.getByTestId('event-count')).toHaveText('1 Ereignis');
});

test('imports, reloads and exports the canonical Twinkle fixture with durations and tracks', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('song-file-input').setInputFiles(TWINKLE_IMPORT_FIXTURE);
  await expect(page.getByTestId('song-title')).toHaveValue('Twinkle, Twinkle, Little Star');
  await expect(page.locator('.song-line')).toHaveCount(6);
  await expectTwinkleState(page);

  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.locator('.song-line')).toHaveCount(6);
  await expectTwinkleState(page);

  const downloadPromise = page.waitForEvent('download');
  await openDocumentMenu(page);
  await page.getByTestId('export-button').click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8')) as Record<
    string,
    any
  >;
  expect(exported['song']['title']).toBe('Twinkle, Twinkle, Little Star');
  expect(exported['song']['lines']).toHaveLength(6);
  const exportedWords = exported['song']['lines'].flatMap(
    (line: Record<string, any>) => line['words'],
  );
  expect(exportedWords).toHaveLength(24);
  expect(exportedWords.filter((word: Record<string, any>) => word['eventTracks'])).toHaveLength(6);
  expect(
    exportedWords
      .flatMap((word: Record<string, any>) => word['eventTracks'] ?? [])
      .filter((track: string | null) => track === 'accompaniment'),
  ).toHaveLength(6);
  expect(exported['formatVersion']).toBe(2);
  expect(
    exportedWords.every(
      (word: Record<string, any>) =>
        Array.isArray(word['melodyEvents']) && Array.isArray(word['accompanimentEvents']),
    ),
  ).toBe(true);
  expect(
    exportedWords.every((word: Record<string, any>) =>
      [...word['melodyEvents'], ...word['accompanimentEvents']].every(
        (event: Record<string, any>) => !('track' in event),
      ),
    ),
  ).toBe(true);
});

test('splits a word into explicitly assigned syllables through undo, reload and player projection', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('song-title')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('kalimba-note-tool-v1', 'syllable-sentinel'));
  await page.getByTestId('song-file-input').setInputFiles(TWINKLE_IMPORT_FIXTURE);
  await page.getByTestId('word-card-0-0').click();
  await page.getByTestId('syllable-split').locator('summary').click();

  await page.getByTestId('syllable-split-point').selectOption('4');
  await page.getByTestId('syllable-split-events-melody').selectOption('1');
  await page.getByTestId('syllable-split-events-accompaniment').selectOption('0');
  await expect(page.getByTestId('syllable-split-preview')).toContainText('Twin-');
  await expect(page.getByTestId('syllable-split-preview')).toContainText('kle,');
  await expect(page.locator('[data-testid^="word-card-0-"]')).toHaveCount(4);
  expect((await readStoredWord(page, 0, 0))['text']).toBe('Twinkle,');

  await page.getByTestId('syllable-split-confirm').click();
  await expect(page.locator('[data-testid^="word-card-0-"]')).toHaveCount(5);
  await expect(page.getByTestId('word-card-0-0')).toContainText('Twin-');
  await expect(page.getByTestId('word-card-0-1')).toContainText('kle,');
  const splitFirst = await readStoredWord(page, 0, 0);
  const splitSecond = await readStoredWord(page, 0, 1);
  expect(splitFirst['melodyEvents']).toHaveLength(1);
  expect(splitFirst['accompanimentEvents']).toHaveLength(0);
  expect(splitSecond['melodyEvents']).toHaveLength(1);
  expect(splitSecond['accompanimentEvents']).toHaveLength(1);
  expect(splitFirst['melodyEvents'][0]).toMatchObject({ kind: 'note', duration: 1 });
  expect(splitSecond['melodyEvents'][0]).toMatchObject({ kind: 'note', duration: 1 });
  expect(splitSecond['accompanimentEvents'][0]).toMatchObject({ kind: 'chord', duration: 2 });

  await page.getByTestId('undo-structure-editor').click();
  await expect(page.locator('[data-testid^="word-card-0-"]')).toHaveCount(4);
  await expect(page.getByTestId('word-card-0-0')).toContainText('Twinkle,');
  await page.getByTestId('redo-structure-editor').click();
  await expect(page.locator('[data-testid^="word-card-0-"]')).toHaveCount(5);
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });

  const downloadPromise = page.waitForEvent('download');
  await openDocumentMenu(page);
  await page.getByTestId('export-button').click();
  const exported = JSON.parse(
    await readFile((await (await downloadPromise).path())!, 'utf8'),
  ) as Record<string, any>;
  expect(exported['song']['lines'][0]['words'][0]).toMatchObject({
    text: 'Twin-',
    notation: '1',
    melodyEvents: [{ kind: 'note', duration: 1 }],
    accompanimentEvents: [],
  });
  expect(exported['song']['lines'][0]['words'][1]).toMatchObject({
    text: 'kle,',
    notation: '1 (35)',
    eventDurations: [1, 2],
    eventTracks: ['melody', 'accompaniment'],
    melodyEvents: [{ kind: 'note', duration: 1 }],
    accompanimentEvents: [{ kind: 'chord', duration: 2 }],
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.locator('[data-testid^="word-card-0-"]')).toHaveCount(5);
  await page.getByTestId('word-card-0-0').click();
  await page.getByTestId('syllable-split').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('syllable-split')).toBeVisible();
  await expectNoPageOverflow(page);
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'syllable-sentinel',
  );

  await page.getByRole('button', { name: 'Editor schließen' }).click();
  await page.getByTestId('open-player').click();
  await expect(page.locator('.score-entry')).toHaveCount(25);
  await expect(page.getByTestId('lyric-0-0')).toHaveText('Twin-');
  await expect(page.getByTestId('lyric-0-1')).toHaveText('kle,');
  await page.getByTestId('score-word-0-1').click();
  await expect(page.getByTestId('lyric-0-1')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('.lyric-syllable[aria-current="true"]')).toHaveCount(1);
  await expect(page.locator('.score-entry', { hasText: /^-$/ })).toHaveCount(0);
  await expectNoPageOverflow(page);
});

test('edits parallel melody and accompaniment tracks through undo, reload and player handoff', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('song-title')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('kalimba-note-tool-v1', 'track-sentinel'));
  await page.getByTestId('song-file-input').setInputFiles(TWINKLE_IMPORT_FIXTURE);
  await page.getByTestId('word-card-0-1').click();

  await expect(page.getByTestId('track-row-melody').locator('.event-chip')).toHaveCount(2);
  await expect(page.getByTestId('track-row-accompaniment').locator('.event-chip')).toHaveCount(0);
  await page.getByTestId('track-target-accompaniment').click();
  await expect(page.getByTestId('track-target-accompaniment')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByTestId('key-10-5-0').click();
  await expect(page.getByText(/Zunge.*anderen Spur/i)).toBeVisible();
  await expect(page.getByTestId('track-row-accompaniment').locator('.event-chip')).toHaveCount(0);

  await page.getByTestId('key-9-3-0').click();
  const accompaniment = page.getByTestId('track-row-accompaniment').locator('.event-chip');
  await expect(accompaniment).toHaveCount(1);
  await expect(accompaniment).toContainText('E · 3');
  await expect(accompaniment.locator('[data-profile-color="#26562A"]')).toHaveCount(1);
  await page.getByTestId('undo-structure-editor').click();
  await expect(page.getByTestId('track-row-accompaniment').locator('.event-chip')).toHaveCount(0);
  await page.getByTestId('redo-structure-editor').click();
  await expect(page.getByTestId('track-row-accompaniment').locator('.event-chip')).toHaveCount(1);
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });

  const downloadPromise = page.waitForEvent('download');
  await openDocumentMenu(page);
  await page.getByTestId('export-button').click();
  const exported = JSON.parse(
    await readFile((await (await downloadPromise).path())!, 'utf8'),
  ) as Record<string, any>;
  expect(exported['song']['lines'][0]['words'][1]['eventTracks']).toEqual([
    'melody',
    'melody',
    'accompaniment',
  ]);
  expect(exported['fixtureVersion']).toBe(1);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-1').click();
  await expect(page.getByTestId('track-row-melody')).toBeVisible();
  await expect(page.getByTestId('track-row-accompaniment')).toBeVisible();
  await expect(page.getByTestId('track-row-accompaniment').locator('.event-chip')).toHaveCount(1);
  await expectNoPageOverflow(page);
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'track-sentinel',
  );

  await page.getByTestId('word-editor').locator('button[title*="Esc"]').click();
  await page.getByTestId('open-player').click();
  await expect(page.locator('.flow-event.accompaniment')).not.toHaveCount(0);
  await expect(page.locator('.score-event[data-track="accompaniment"]')).not.toHaveCount(0);
  await page.getByTestId('practice-settings').locator(':scope > summary').click();
  await page.getByTestId('mixer-drawer').getByText('Mixer').click();
  await expect(page.getByTestId('track-melody')).toBeVisible();
  await expect(page.getByTestId('track-accompaniment')).toBeVisible();
  await expectNoPageOverflow(page);
});

test('previews a line, block and event without changing selection or song data', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('song-title')).toBeVisible();
  await page.getByTestId('song-file-input').setInputFiles(TWINKLE_IMPORT_FIXTURE);
  const originalWord = await readStoredWord(page, 0, 0);

  await page.getByTestId('line-preview-0').click();
  await page.getByTestId('word-preview-0-0').click();
  await expect(page.getByTestId('word-card-0-0')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('word-editor')).toHaveCount(0);
  expect(await readStoredWord(page, 0, 0)).toEqual(originalWord);

  await page.getByTestId('word-card-0-0').click();
  await page.getByTestId('event-preview-0').click();
  await page.getByTestId('block-preview-editor').click();
  await expect(page.getByTestId('audition-keys')).not.toBeChecked();
  await page.getByTestId('audition-keys').check();
  await expect(page.getByText('Ton beim Klick auf Zunge anhören')).toBeVisible();
  expect(await readStoredWord(page, 0, 0)).toEqual(originalWord);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Editor schließen' }).click();
  await page.getByTestId('word-card-0-0').click();
  await expect(page.getByTestId('block-preview-editor')).toBeVisible();
  await expect(page.getByTestId('event-preview-0')).toBeVisible();
  await expectNoPageOverflow(page);
});

test('keeps text edits in document history across inspector and player navigation', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-0').click();
  const word = page.getByTestId('word-0-0');
  await word.fill('Willkommen zurück');
  await expect(word).toBeFocused();

  await page.keyboard.press('Control+z');
  await expect(word).toHaveValue('Willkommen');
  await expect(word).toBeFocused();
  await page.keyboard.press('Control+y');
  await expect(word).toHaveValue('Willkommen zurück');
  await expect(word).toBeFocused();

  await page.getByTestId('word-card-0-1').click();
  await expect(page.getByTestId('word-editor')).toContainText('Block 2');
  await page.getByRole('button', { name: 'Editor schließen' }).click();
  await expect(page.getByTestId('word-editor')).toHaveCount(0);
  await page.getByTestId('open-player').click();
  await page.getByTestId('back-to-editor').click();
  await expect(page.getByTestId('song-title')).toBeFocused();
  await page.getByTestId('edit-mode-toggle').click();

  await page.getByTestId('word-card-0-0').click();
  await expect(word).toHaveValue('Willkommen zurück');
  await word.focus();
  await page.keyboard.press('Control+z');
  await expect(word).toHaveValue('Willkommen');
  await expect(word).toBeFocused();
  await page.keyboard.press('Control+Shift+z');
  await expect(word).toHaveValue('Willkommen zurück');
  await expect(word).toBeFocused();
  await expect(page.locator('.save-state')).toHaveAttribute('data-status', 'saved', {
    timeout: 5_000,
  });

  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-0').click();
  await expect(page.getByTestId('word-0-0')).toHaveValue('Willkommen zurück');
});

test('edits title, word and raw notation and restores them after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  const title = page.getByTestId('song-title');
  await expect(title).toBeVisible();
  await title.fill('Reload Song äöü');
  await page.getByTestId('word-card-0-0').click();
  await page.getByTestId('word-0-0').fill('Märchen');
  await page.getByText('Textnotation und Kompatibilität', { exact: true }).click();
  await page.getByTestId('notation-0-0').fill('(13) 5′-x(');
  // Autosave is debounced by 350 ms; cross that boundary before asserting persistence.
  await page.waitForTimeout(700);
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });
  const persistedWord = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('kalimba-angular-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<Record<string, unknown>>((resolve, reject) => {
        const transaction = database.transaction(['meta', 'songs']);
        const currentRequest = transaction.objectStore('meta').get('current-song-id');
        currentRequest.onsuccess = () => {
          const request = transaction.objectStore('songs').get(currentRequest.result.value);
          request.onsuccess = () =>
            resolve(request.result.document.song.lines[0].words[0] as Record<string, unknown>);
          request.onerror = () => reject(request.error);
        };
        currentRequest.onerror = () => reject(currentRequest.error);
      });
    } finally {
      database.close();
    }
  });
  expect(persistedWord).not.toHaveProperty('notation');
  expect(persistedWord['melodyEvents']).toEqual([
    {
      kind: 'chord',
      pitches: [
        { degree: 1, octave: 0 },
        { degree: 3, octave: 0 },
      ],
      duration: 1,
    },
    { kind: 'note', pitch: { degree: 5, octave: 1 }, duration: 1 },
    { kind: 'separator' },
  ]);
  expect(persistedWord['accompanimentEvents']).toEqual([]);
  expect(persistedWord['legacyNotation']).toMatchObject({ raw: '(13) 5′-x(' });
  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('song-title')).toHaveValue('Reload Song äöü');
  await page.getByTestId('word-card-0-0').click();
  await expect(page.getByTestId('word-0-0')).toHaveValue('Märchen');
  await expect(page.getByTestId('notation-0-0')).toHaveValue('(13) 5′-x(');
});

test('edits structured notes, chords and separators in the selected word', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-0').click();
  const keys = page.locator('.key-button');
  await expect(keys).toHaveCount(17);
  await expect(keys.first()).toHaveAttribute('aria-label', 'D 2″, linke Hand');
  await expect(keys.last()).toHaveAttribute('aria-label', 'E 3″, rechte Hand');
  await expect(page.getByTestId('key-8-1-0')).toHaveClass(/is-used/);

  await page.getByTestId('event-remove-0').click();
  await page.getByTestId('key-8-1-0').click();
  await page.getByRole('radio', { name: 'Akkord', exact: true }).check();
  await page.getByTestId('key-9-3-0').click();
  await page.getByTestId('key-10-5-0').click();
  await expect(page.getByTestId('key-9-3-0')).toHaveClass(/is-draft/);
  await expect(page.getByTestId('key-9-3-0')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Akkord einfügen' }).click();
  await page.getByRole('button', { name: 'Trenner einfügen' }).click();

  await expect(page.getByTestId('notation-0-0')).toHaveValue('2 3 (135) 1 (35) -');
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });
  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-0').click();
  await expect(page.getByTestId('notation-0-0')).toHaveValue('2 3 (135) 1 (35) -');
});

test('restores a removed music event through central undo and persists the redone deletion', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('song-title')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('kalimba-note-tool-v1', 'event-undo-sentinel'));
  await page.getByTestId('song-file-input').setInputFiles(SYNTHETIC_IMPORT_FIXTURE);
  await page.getByTestId('word-card-0-0').click();
  const originalWord = await readStoredWord(page, 0, 0);

  await page.getByTestId('event-remove-0').click();
  await expect(page.getByTestId('notation-0-0')).toHaveValue('-');
  await expect(page.getByTestId('event-count')).toHaveText('1 Ereignis');
  await expect(page.getByTestId('undo-structure-editor')).toBeEnabled();

  await page.getByTestId('undo-structure-editor').click();
  await expect(page.getByTestId('notation-0-0')).toHaveValue('(13)-');
  await expect(page.getByTestId('word-card-0-0')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('word-card-0-0')).toBeFocused();
  await expect.poll(() => readStoredWord(page, 0, 0)).toEqual(originalWord);

  await page.keyboard.press('Control+Shift+z');
  await expect(page.getByTestId('notation-0-0')).toHaveValue('-');
  await expect(page.getByTestId('event-count')).toHaveText('1 Ereignis');
  await expect(page.getByTestId('word-card-0-0')).toBeFocused();
  await expect
    .poll(async () => (await readStoredWord(page, 0, 0))['melodyEvents'])
    .toHaveLength(originalWord['melodyEvents'].length - 1);

  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-0').click();
  await expect(page.getByTestId('notation-0-0')).toHaveValue('-');
  const reloadedWord = await readStoredWord(page, 0, 0);
  expect(reloadedWord['extra']).toEqual(originalWord['extra']);
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'event-undo-sentinel',
  );
});

test('opens and closes the focused word editor as a mobile bottom sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();

  await page.getByTestId('word-card-0-0').click();
  await expect(page.getByTestId('word-editor')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await openBlockManagement(page);
  await page.getByTestId('block-add-word').click();
  await expect(page.getByTestId('word-card-0-1')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('word-editor')).toContainText('Block 2');
  expect(
    await page.evaluate(() => !!document.activeElement?.closest('[data-testid="word-editor"]')),
  ).toBe(true);
  await page.getByTestId('undo-structure-editor').click();
  await expect(page.getByTestId('word-card-0-1')).toContainText('Textloser Abschnitt');
  await expect(page.getByTestId('word-editor')).toContainText('Block 1');
  await page.getByTestId('redo-structure-editor').click();
  await expect(page.getByTestId('word-editor')).toContainText('Block 2');
  await expect(page.getByTestId('word-0-1')).toHaveValue('Neues Wort');
  await page.getByTestId('undo-structure-editor').click();
  await expect(page.getByTestId('word-editor')).toContainText('Block 1');
  expect(
    await page.evaluate(() => !!document.activeElement?.closest('[data-testid="word-editor"]')),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole('button', { name: 'Editor schließen' }).last().click();
  await expect(page.getByTestId('word-editor')).toBeHidden();
  await expect(page.getByTestId('word-card-0-0')).toBeFocused();
});

test('preserves a two-beat phrase ending through undo, export, reload and player projection', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('song-title')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('kalimba-note-tool-v1', 'duration-sentinel'));
  await page.getByTestId('song-file-input').setInputFiles(TWINKLE_IMPORT_FIXTURE);
  await page.getByTestId('word-card-0-3').click();

  const duration = page.getByTestId('event-duration-0');
  await expect(duration).toHaveValue('2');
  await duration.selectOption('1');
  await expect(duration).toHaveValue('1');
  await page.getByTestId('undo-structure-editor').click();
  await expect(duration).toHaveValue('2');
  await page.getByTestId('redo-structure-editor').click();
  await expect(duration).toHaveValue('1');
  await page.getByTestId('undo-structure-editor').click();
  await expect(duration).toHaveValue('2');
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });

  const exportDownload = page.waitForEvent('download');
  await openDocumentMenu(page);
  await page.getByTestId('export-button').click();
  const exported = JSON.parse(
    await readFile((await (await exportDownload).path())!, 'utf8'),
  ) as Record<string, any>;
  expect(exported['song']['lines'][0]['words'][3]['eventDurations']).toEqual([2]);

  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-3').click();
  await expect(page.getByTestId('event-duration-0')).toHaveValue('2');
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'duration-sentinel',
  );

  await page.getByTestId('open-player').click();
  await expect(page.getByTestId('position')).toHaveAttribute('max', '48');
  const phraseEnding = page.getByTestId('score-word-0-3').locator('.score-event');
  await expect(phraseEnding).toHaveAttribute('data-duration-beats', '2');
  await expect(phraseEnding).toContainText('2 Schläge');
  const oneBeatFlow = await page
    .locator('.falling-event-slot[data-start="0"] .flow-event')
    .first()
    .boundingBox();
  const twoBeatFlow = await page
    .locator('.falling-event-slot[data-start="6"] .flow-event')
    .first()
    .boundingBox();
  expect(oneBeatFlow).not.toBeNull();
  expect(twoBeatFlow).not.toBeNull();
  expect(twoBeatFlow!.height).toBeGreaterThan(oneBeatFlow!.height);
});

test('performs block and line structure actions, transfers only events and restores them after reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('song-title')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('kalimba-note-tool-v1', 'user-sentinel'));

  await page.getByTestId('word-card-0-0').click();
  await openBlockManagement(page);
  await page.getByTestId('block-add-word').click();
  await expect(page.getByTestId('word-0-1')).toHaveValue('Neues Wort');
  await openBlockActions(page);
  await page.getByTestId('block-delete').click();
  await expect(page.locator('[data-testid^="word-card-0-"]')).toHaveCount(2);

  await page.getByTestId('word-card-0-0').click();
  await openBlockManagement(page);
  await page.getByTestId('block-add-melody').click();
  await expect(page.getByTestId('word-0-1')).toHaveValue('');
  await expect(page.getByTestId('melody-block-marker')).toBeVisible();
  await openBlockActions(page);
  await page.getByTestId('block-delete').click();

  await page.getByTestId('word-card-0-0').click();
  await openBlockActions(page);
  await page.getByTestId('block-duplicate').click();
  await expect(page.getByTestId('notation-0-1')).toHaveValue('1 2 3 (135)');
  await openLineActions(page, 0);
  await page.getByTestId('line-duplicate-0').click();
  await expect(page.locator('.song-line')).toHaveCount(2);
  await expect(page.locator('[data-testid^="word-card-1-"]')).toHaveCount(3);
  await openLineActions(page, 1);
  await page.getByTestId('line-delete-1').click();
  await expect(page.locator('.song-line')).toHaveCount(1);

  await page.getByTestId('line-add-0').click();
  await expect(page.locator('.song-line')).toHaveCount(2);
  await page.getByTestId('word-card-0-0').click();
  await openBlockActions(page);
  await page.getByTestId('block-copy-next-line').click();
  await expect(page.getByTestId('word-1-0')).toHaveValue('Neue Zeile');
  await expect(page.getByTestId('notation-1-0')).toHaveValue('1 2 3 (135)');
  await expect(page.getByTestId('word-card-1-0')).toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');

  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1')))
    .toBe('user-sentinel');
  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();

  await expect(page.locator('.song-line')).toHaveCount(2);
  await page.getByTestId('word-card-1-0').click();
  await expect(page.getByTestId('word-1-0')).toHaveValue('Neue Zeile');
  await expect(page.getByTestId('notation-1-0')).toHaveValue('1 2 3 (135)');
  await expect(page.getByTestId('undo-structure')).toBeDisabled();
  await expect(page.getByTestId('redo-structure')).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'user-sentinel',
  );
});

test('undoes and redoes structure actions with buttons and keyboard shortcuts', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await page.getByTestId('word-card-0-0').focus();
  await page.getByTestId('word-card-0-0').press('Enter');

  await openBlockActions(page);
  await page.getByTestId('block-duplicate').click();
  await expect(page.getByTestId('word-card-0-1')).toBeFocused();
  await openLineActions(page, 0);
  await page.getByTestId('line-duplicate-0').click();
  await expect(page.getByTestId('word-card-1-0')).toBeFocused();
  await expect(page.locator('.song-line')).toHaveCount(2);

  await page.getByTestId('undo-structure').click();
  await expect(page.locator('.song-line')).toHaveCount(1);
  await expect(page.getByTestId('word-card-0-1')).toBeFocused();
  await expect(page.getByTestId('word-card-0-1')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('redo-structure').click();
  await expect(page.locator('.song-line')).toHaveCount(2);
  await expect(page.getByTestId('word-card-1-0')).toBeFocused();

  await page.keyboard.press('Control+z');
  await expect(page.locator('.song-line')).toHaveCount(1);
  await page.keyboard.press('Control+y');
  await expect(page.locator('.song-line')).toHaveCount(2);

  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-testid^="word-card-0-"]')).toHaveCount(2);
  await expect(page.getByTestId('word-card-0-0')).toBeFocused();
  await expect(page.getByTestId('undo-structure')).toBeDisabled();
  await expect(page.getByTestId('redo-structure')).toBeEnabled();

  await openLineActions(page, 0);
  await page.getByTestId('line-add-0').click();
  await expect(page.locator('.song-line')).toHaveCount(2);
  await expect(page.getByTestId('redo-structure')).toBeDisabled();
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
});

test('moves blocks and whole lines with drag-drop and keyboard without fidelity loss', async ({
  page,
}) => {
  test.skip(
    test.info().project.name.includes('webkit'),
    'Native desktop drag is covered in Chromium; touch drag remains outside this slice.',
  );
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await page.setViewportSize({ width: 1440, height: 1400 });
  await expect(page.getByTestId('song-title')).toBeVisible();
  await page.getByTestId('song-file-input').setInputFiles(SYNTHETIC_IMPORT_FIXTURE);

  await dragWithMouse(
    page,
    page.getByTestId('word-drag-handle-0-0'),
    page.getByTestId('word-card-0-1'),
  );
  await expect(page.getByTestId('word-card-0-0')).toContainText('vom');
  await expect(page.getByTestId('word-card-0-1')).toContainText('Grüße –');
  await page.getByTestId('undo-structure').click();
  await expect(page.getByTestId('word-card-0-0')).toContainText('Grüße –');

  await page.getByTestId('word-drag-handle-0-0').press('Alt+ArrowRight');
  await expect(page.getByTestId('word-card-0-0')).toContainText('vom');
  await expect(page.getByTestId('word-card-0-1')).toContainText('Grüße –');
  await page.getByTestId('undo-structure').click();

  await dragWithMouse(
    page,
    page.getByTestId('word-drag-handle-0-0'),
    page.getByTestId('word-card-1-1'),
  );
  await expect(page.getByTestId('structure-status')).toHaveText('Block verschoben');
  await expect(page.locator('.word-card')).toHaveCount(6);
  await expect(page.getByTestId('song-line-0').locator('.word-card')).toHaveCount(2);
  await expect(page.getByTestId('song-line-1').locator('.word-card')).toHaveCount(3);
  await expect(page.getByTestId('song-line-1').locator('.word-card').last()).toContainText(
    'Grüße –',
  );
  await page.getByTestId('undo-structure').click();
  await expect(page.getByTestId('song-line-0').locator('.word-card')).toHaveCount(3);

  await dragWithMouse(
    page,
    page.getByTestId('line-drag-handle-0'),
    page.getByTestId('song-line-1'),
  );
  await expect(page.getByTestId('song-line-0')).toContainText('zweite');
  await expect(page.getByTestId('song-line-1')).toContainText('Grüße –');
  await page.getByTestId('undo-structure').click();
  await expect(page.getByTestId('song-line-0')).toContainText('Grüße –');

  await page.getByTestId('line-drag-handle-0').press('ArrowDown');
  await expect(page.getByTestId('song-line-0')).toContainText('zweite');
  await expect(page.getByTestId('song-line-1')).toContainText('Grüße –');
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });

  const downloadPromise = page.waitForEvent('download');
  await openDocumentMenu(page);
  await page.getByTestId('export-button').click();
  const exported = JSON.parse(
    await readFile((await (await downloadPromise).path())!, 'utf8'),
  ) as Record<string, any>;
  expect(exported['unknownRoot']).toEqual({ mustSurvive: true });
  expect(exported['song']['lines'][1]['unknownLineField']).toBe('Strophe A');
  expect(exported['song']['lines'][1]['words'][0]['unknownWordField']).toEqual(['bleibt', 1]);

  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('song-line-0')).toContainText('zweite');
  await expect(page.getByTestId('song-line-1')).toContainText('Grüße –');
  await expect(page.getByTestId('undo-structure')).toBeDisabled();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('word-drag-handle-0-0')).toBeHidden();
  await expect(page.getByTestId('line-drag-handle-0')).toBeHidden();
  await expect(page.getByTestId('word-card-0-0')).toBeVisible();
  await expectNoPageOverflow(page);
});

async function openBlockActions(page: Page): Promise<void> {
  await openBlockManagement(page);
  const actions = page.getByTestId('more-block-actions');
  if (!(await actions.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await actions.locator(':scope > summary').click();
  }
}

async function dragWithMouse(
  page: Page,
  source: import('@playwright/test').Locator,
  target: import('@playwright/test').Locator,
): Promise<void> {
  await page.waitForTimeout(150);
  await expect(source).toBeVisible();
  await expect(target).toBeVisible();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  const hit = await page.evaluate(
    ({ x, y }) => {
      const element = document.elementFromPoint(x, y) as HTMLElement | null;
      return {
        tag: element?.tagName,
        className: element?.className,
        testId: element?.closest<HTMLElement>('[data-testid]')?.dataset['testid'],
      };
    },
    { x: sourceBox!.x + sourceBox!.width / 2, y: sourceBox!.y + sourceBox!.height / 2 },
  );
  if (hit.testId !== (await source.getAttribute('data-testid'))) {
    throw new Error(`Unexpected drag hit target: ${JSON.stringify(hit)}`);
  }
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.move(
    sourceBox!.x + sourceBox!.width / 2 + 24,
    sourceBox!.y + sourceBox!.height / 2,
    {
      steps: 3,
    },
  );
  await page.mouse.move(targetBox!.x + targetBox!.width - 3, targetBox!.y + targetBox!.height - 3, {
    steps: 12,
  });
  await page.mouse.up();
}

async function openLineActions(page: Page, lineIndex: number): Promise<void> {
  const actions = page.getByTestId(`line-actions-${lineIndex}`);
  if (!(await actions.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await actions.locator(':scope > summary').click();
  }
  await expect(page.getByTestId(`line-duplicate-${lineIndex}`)).toBeVisible();
}

async function openBlockManagement(page: Page): Promise<void> {
  const management = page.getByTestId('block-management');
  if (!(await management.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await management.locator(':scope > summary').click();
  }
}

test('keeps selection and focus stable during keyboard navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  const firstWord = page.getByTestId('word-card-0-0');
  const secondWord = page.getByTestId('word-card-0-1');

  await firstWord.focus();
  await firstWord.press('Enter');
  await firstWord.press('ArrowRight');
  await expect(secondWord).toBeFocused();
  await expect(secondWord).toHaveAttribute('aria-pressed', 'true');

  await secondWord.press('Escape');
  await expect(page.getByTestId('word-editor')).toBeHidden();
});

test('selects desktop ranges, copies notes and chords, pastes with undo and persists after reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  await expect(page.getByTestId('song-title')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('kalimba-note-tool-v1', 'user-sentinel'));
  await page.getByTestId('song-file-input').setInputFiles(SYNTHETIC_IMPORT_FIXTURE);

  const sourceFirst = page.getByTestId('word-card-0-0');
  const sourceMiddle = page.getByTestId('word-card-0-1');
  const sourceLast = page.getByTestId('word-card-0-2');
  await sourceFirst.click();
  await sourceLast.click({ modifiers: ['Shift'] });
  await expect(page.getByTestId('selection-count')).toHaveText('3 Blöcke ausgewählt');
  await expect(sourceMiddle).toHaveAttribute('aria-pressed', 'true');

  await sourceMiddle.click({ modifiers: ['Control'] });
  await expect(page.getByTestId('selection-count')).toHaveText('2 Blöcke ausgewählt');
  await expect(sourceMiddle).toHaveAttribute('aria-pressed', 'false');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const toolbar = page.getByTestId('selection-toolbar');
  await expect(toolbar).toBeVisible();
  const toolbarBox = await toolbar.boundingBox();
  expect(toolbarBox).not.toBeNull();
  expect(toolbarBox!.y).toBeGreaterThanOrEqual(0);
  expect(toolbarBox!.y + toolbarBox!.height).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerHeight),
  );

  await page.getByTestId('copy-selection').click();
  await expect(page.getByTestId('clipboard-count')).toHaveText('2 kopiert');
  await page.getByTestId('clear-selection').click();

  const targetFirst = page.getByTestId('word-card-1-0');
  const targetLast = page.getByTestId('word-card-1-1');
  await targetFirst.click();
  await targetLast.click({ modifiers: ['Shift'] });
  await expect(page.getByTestId('selection-count')).toHaveText('2 Blöcke ausgewählt');
  await page.getByTestId('paste-selection').click();
  await expect(page.getByTestId('redo-structure')).toBeDisabled();

  await expect(targetLast).toBeFocused();
  await expect(targetFirst).toHaveAttribute('aria-pressed', 'true');
  await expect(targetLast).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });

  const pastedState = await readPasteState(page);
  expect(pastedState).toEqual({
    targetTexts: ['zweite', 'Zeile'],
    targetKinds: [['chord'], ['note', 'separator', 'note', 'chord', 'note']],
    unknownRoot: { mustSurvive: true },
    unknownSource: ['bleibt', 1],
    unknownTarget: { mustSurvive: true },
    legacySource: 'user-sentinel',
  });

  await page.getByTestId('undo-structure').click();
  await expect(page.getByTestId('selection-count')).toHaveText('2 Blöcke ausgewählt');
  await expect(targetLast).toBeFocused();
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });
  expect((await readPasteState(page)).targetKinds).toEqual([
    ['note', 'note'],
    ['chord', 'separator'],
  ]);

  await page.getByTestId('paste-selection').click();
  await expect
    .poll(async () => (await readPasteState(page)).targetKinds)
    .toEqual([['chord'], ['note', 'separator', 'note', 'chord', 'note']]);
  await expect(page.getByText('Lokal gespeichert')).toBeVisible({ timeout: 5_000 });
  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();

  await page.getByTestId('word-card-1-0').click();
  await expect(page.getByTestId('word-1-0')).toHaveValue('zweite');
  await expect(page.getByTestId('notation-1-0')).toHaveValue('(13)');
  await page.getByTestId('word-card-1-1').click();
  await expect(page.getByTestId('word-1-1')).toHaveValue('Zeile');
  await expect(page.getByTestId('notation-1-1')).toHaveValue('3′ - 4′ (2′5′) 1′');
  expect(await page.evaluate(() => localStorage.getItem('kalimba-note-tool-v1'))).toBe(
    'user-sentinel',
  );
  expect((await readPasteState(page)).unknownTarget).toEqual({ mustSurvive: true });
});

test('stores a manual theme and restores it after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('edit-mode-toggle').click();
  const themeSelect = page.getByTestId('theme-select');

  await expect(themeSelect).toHaveValue('system');
  await themeSelect.selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY))
    .toBe('dark');

  await page.reload();
  await page.getByTestId('edit-mode-toggle').click();
  await expect(themeSelect).toHaveValue('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await themeSelect.selectOption('system');
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY))
    .toBeNull();
});

test('keeps the editor panel and fields inside large and compact desktop viewports', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 920, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByTestId('edit-mode-toggle').click();
    await page.getByTestId('word-card-0-0').click();

    await expectNoPageOverflow(page);
    await expectInsideViewport(page, page.getByTestId('word-editor'));
    await expectInsideViewport(page, page.getByTestId('word-0-0'));
    await expectInsideViewport(page, page.getByTestId('notation-0-0'));

    await expect(page.getByText('Linke Hand', { exact: true })).toBeVisible();
    await expect(page.getByText('Rechte Hand', { exact: true })).toBeVisible();
    await expect(page.getByTestId('key-palette-left').locator('.key-button')).toHaveCount(8);
    await expect(page.getByTestId('key-palette-right').locator('.key-button')).toHaveCount(9);
    for (const hand of ['left', 'right']) {
      const palette = page.getByTestId(`key-palette-${hand}`);
      expect(
        await palette.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
      ).toBe(true);
    }
  }
});

async function readStoredWord(
  page: Page,
  lineIndex: number,
  wordIndex: number,
): Promise<Record<string, any>> {
  return page.evaluate(
    async ({ lineIndex, wordIndex }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('kalimba-angular-v1');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        return await new Promise<Record<string, any>>((resolve, reject) => {
          const transaction = database.transaction(['meta', 'songs']);
          const currentRequest = transaction.objectStore('meta').get('current-song-id');
          currentRequest.onsuccess = () => {
            const request = transaction.objectStore('songs').get(currentRequest.result.value);
            request.onsuccess = () =>
              resolve(request.result.document.song.lines[lineIndex].words[wordIndex]);
            request.onerror = () => reject(request.error);
          };
          currentRequest.onerror = () => reject(currentRequest.error);
        });
      } finally {
        database.close();
      }
    },
    { lineIndex, wordIndex },
  );
}

async function expectTwinkleState(page: Page): Promise<void> {
  const lines = await page.locator('.song-line').evaluateAll((elements) =>
    elements.map((line) =>
      Array.from(line.querySelectorAll('.word-card strong'))
        .map((element) => element.textContent?.trim() ?? '')
        .join(' '),
    ),
  );
  expect(lines).toEqual([
    'Twinkle, twinkle, little star',
    'How I wonder what you are',
    'Up above the world so high',
    'Like a diamond in the sky',
    'Twinkle, twinkle, little star',
    'How I wonder what you are',
  ]);
  const state = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('kalimba-angular-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const document = await new Promise<Record<string, any>>((resolve, reject) => {
        const transaction = database.transaction(['meta', 'songs']);
        const currentRequest = transaction.objectStore('meta').get('current-song-id');
        currentRequest.onsuccess = () => {
          const request = transaction.objectStore('songs').get(currentRequest.result.value);
          request.onsuccess = () => resolve(request.result.document);
          request.onerror = () => reject(request.error);
        };
        currentRequest.onerror = () => reject(currentRequest.error);
      });
      return {
        keys: document['keys'].length,
        events: document['song']['lines'].flatMap((line: Record<string, any>) =>
          line['words'].flatMap((word: Record<string, any>) => [
            ...word['melodyEvents'],
            ...word['accompanimentEvents'],
          ]),
        ),
      };
    } finally {
      database.close();
    }
  });
  expect(state.keys).toBe(17);
  expect(state.events).toHaveLength(48);
  expect(state.events.filter((event: Record<string, any>) => event['duration'] === 2)).toHaveLength(
    12,
  );
  expect(
    state.events.every((event: Record<string, any>) => [1, 2].includes(event['duration'])),
  ).toBe(true);
}

async function readPasteState(page: import('@playwright/test').Page): Promise<{
  targetTexts: string[];
  targetKinds: string[][];
  unknownRoot: unknown;
  unknownSource: unknown;
  unknownTarget: unknown;
  legacySource: string | null;
}> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('kalimba-angular-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const document = await new Promise<Record<string, any>>((resolve, reject) => {
        const transaction = database.transaction(['meta', 'songs']);
        const currentRequest = transaction.objectStore('meta').get('current-song-id');
        currentRequest.onsuccess = () => {
          const request = transaction.objectStore('songs').get(currentRequest.result.value);
          request.onsuccess = () => resolve(request.result.document as Record<string, any>);
          request.onerror = () => reject(request.error);
        };
        currentRequest.onerror = () => reject(currentRequest.error);
      });
      const targets = document['song']['lines'][1]['words'];
      return {
        targetTexts: targets.map((word: Record<string, any>) => word['text']),
        targetKinds: targets.map((word: Record<string, any>) =>
          [...word['melodyEvents'], ...word['accompanimentEvents']].map(
            (event: Record<string, any>) => event['kind'],
          ),
        ),
        unknownRoot: document['extra']['unknownRoot'],
        unknownSource: document['song']['lines'][0]['words'][0]['extra']['unknownWordField'],
        unknownTarget: targets[0]['extra']['unknownPasteTarget'],
        legacySource: localStorage.getItem('kalimba-note-tool-v1'),
      };
    } finally {
      database.close();
    }
  });
}

async function readLibraryState(page: Page): Promise<{
  currentId: string;
  songs: Array<{
    id: string;
    createdAt: string;
    updatedAt: string;
    document: Record<string, any>;
  }>;
}> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('kalimba-angular-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const transaction = database.transaction(['meta', 'songs']);
      const currentRequest = transaction.objectStore('meta').get('current-song-id');
      const songsRequest = transaction.objectStore('songs').getAll();
      const [current, songs] = await Promise.all([
        new Promise<{ value: string }>((resolve, reject) => {
          currentRequest.onsuccess = () => resolve(currentRequest.result as { value: string });
          currentRequest.onerror = () => reject(currentRequest.error);
        }),
        new Promise<
          Array<{
            id: string;
            createdAt: string;
            updatedAt: string;
            document: Record<string, any>;
          }>
        >((resolve, reject) => {
          songsRequest.onsuccess = () => resolve(songsRequest.result);
          songsRequest.onerror = () => reject(songsRequest.error);
        }),
      ]);
      return { currentId: current.value, songs };
    } finally {
      database.close();
    }
  });
}

async function expectNoPageOverflow(page: import('@playwright/test').Page): Promise<void> {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
        document.body.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

async function openDocumentMenu(page: Page): Promise<void> {
  const menu = page.locator('.document-more-actions');
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await menu.locator(':scope > summary').click();
  }
}

async function expectInsideViewport(
  page: import('@playwright/test').Page,
  locator: import('@playwright/test').Locator,
): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
}
