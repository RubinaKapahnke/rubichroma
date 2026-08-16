import { describe, expect, it } from 'vitest';
import { DEFAULT_DOCUMENT } from '../../domain/default-document';
import { cloneDocument } from '../../domain/song-document';
import { createSongLinesForm } from './song-editor-form';

describe('song editor form hydration', () => {
  it('creates a new FormArray reference for every hydrated document snapshot', () => {
    const firstDocument = cloneDocument(DEFAULT_DOCUMENT);
    const secondDocument = cloneDocument(DEFAULT_DOCUMENT);
    secondDocument.song.title = 'Prüflied';
    secondDocument.song.lines[0].words[0].text = 'Grüße';

    const firstLines = createSongLinesForm(firstDocument);
    const secondLines = createSongLinesForm(secondDocument);

    expect(secondLines).not.toBe(firstLines);
    expect(secondLines.at(0).controls.words.at(0).controls.text.value).toBe('Grüße');
    expect(firstLines.at(0).controls.words.at(0).controls.text.value).toBe('Willkommen');

    secondLines.at(0).controls.words.at(0).controls.text.setValue('Geändert');
    expect(firstLines.at(0).controls.words.at(0).controls.text.value).toBe('Willkommen');
  });
});
