import { describe, expect, it } from 'vitest';
import { decodeLegacyNotation, replaceWithLegacyNotation } from './legacy-notation-codec';
import { cloneDocument } from './song-document';
import {
  createMusicSelectionClipboard,
  EMPTY_SONG_SELECTION,
  pasteMusicSelection,
  updateSongSelection,
} from './song-selection-editing';
import { DEFAULT_DOCUMENT } from './default-document';

describe('song selection editing', () => {
  it('selects contiguous ranges and toggles individual blocks in song order', () => {
    const document = cloneDocument(DEFAULT_DOCUMENT);
    document.song.lines.push({
      words: [
        { text: 'Ziel A', ...replaceWithLegacyNotation('4'), extra: {} },
        { text: 'Ziel B', ...replaceWithLegacyNotation('5'), extra: {} },
      ],
      extra: {},
    });

    const first = updateSongSelection(
      document,
      EMPTY_SONG_SELECTION,
      { lineIndex: 0, wordIndex: 0 },
      'single',
    );
    const range = updateSongSelection(document, first, { lineIndex: 1, wordIndex: 0 }, 'range');
    expect(range.positions).toEqual([
      { lineIndex: 0, wordIndex: 0 },
      { lineIndex: 0, wordIndex: 1 },
      { lineIndex: 1, wordIndex: 0 },
    ]);

    const toggledOff = updateSongSelection(
      document,
      range,
      { lineIndex: 0, wordIndex: 1 },
      'toggle',
    );
    expect(toggledOff.positions).toEqual([
      { lineIndex: 0, wordIndex: 0 },
      { lineIndex: 1, wordIndex: 0 },
    ]);
    const toggledOn = updateSongSelection(
      document,
      toggledOff,
      { lineIndex: 1, wordIndex: 1 },
      'toggle',
    );
    expect(toggledOn.positions).toEqual([
      { lineIndex: 0, wordIndex: 0 },
      { lineIndex: 1, wordIndex: 0 },
      { lineIndex: 1, wordIndex: 1 },
    ]);
  });

  it('copies only notes and chords and pastes them positionally without changing text or extras', () => {
    const document = cloneDocument(DEFAULT_DOCUMENT);
    document.song.lines.push({
      words: [
        {
          text: 'Ziel A',
          ...replaceWithLegacyNotation('6 - 7'),
          extra: { unknownTarget: { keep: true } },
        },
        { text: 'Ziel B', ...replaceWithLegacyNotation('(24)-'), extra: { keep: 'yes' } },
      ],
      extra: { unknownLine: 42 },
    });
    const clipboard = createMusicSelectionClipboard(document, [
      { lineIndex: 0, wordIndex: 0 },
      { lineIndex: 0, wordIndex: 1 },
    ]);
    expect(clipboard?.sequences.map((events) => events.map((event) => event.kind))).toEqual([
      ['note', 'note', 'note', 'chord'],
      ['note', 'note', 'note'],
    ]);

    const result = pasteMusicSelection(document, clipboard!, [
      { lineIndex: 1, wordIndex: 0 },
      { lineIndex: 1, wordIndex: 1 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const firstTarget = result.document.song.lines[1].words[0];
    const secondTarget = result.document.song.lines[1].words[1];
    expect(firstTarget.text).toBe('Ziel A');
    expect(firstTarget.extra).toEqual({ unknownTarget: { keep: true } });
    expect(firstTarget.events.map((event) => event.kind)).toEqual([
      'note',
      'separator',
      'note',
      'note',
      'chord',
    ]);
    expect(secondTarget.text).toBe('Ziel B');
    expect(secondTarget.extra).toEqual({ keep: 'yes' });
    expect(secondTarget.events.map((event) => event.kind)).toEqual([
      'note',
      'separator',
      'note',
      'note',
    ]);
    expect(result.document.song.lines[1].extra).toEqual({ unknownLine: 42 });
    expect(document.song.lines[1].words[0].legacyNotation.raw).toBe('6 - 7');
  });

  it('rejects mismatched target counts and unknown legacy fragments without mutation', () => {
    const document = cloneDocument(DEFAULT_DOCUMENT);
    document.song.lines[0].words[1] = {
      text: 'Unbekannt',
      ...replaceWithLegacyNotation('5′-x('),
      extra: { mustSurvive: true },
    };
    const original = structuredClone(document);
    const clipboard = createMusicSelectionClipboard(document, [{ lineIndex: 0, wordIndex: 0 }])!;

    expect(pasteMusicSelection(document, clipboard, [])).toEqual({
      ok: false,
      reason: 'selection-count-mismatch',
    });
    expect(pasteMusicSelection(document, clipboard, [{ lineIndex: 0, wordIndex: 1 }])).toEqual({
      ok: false,
      reason: 'target-has-unknown-legacy-fragments',
    });
    expect(document).toEqual(original);
    expect(
      decodeLegacyNotation(document.song.lines[0].words[1].legacyNotation.raw).hasUnknownFragments,
    ).toBe(true);
  });
});
