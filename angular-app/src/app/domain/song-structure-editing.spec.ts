import { describe, expect, it } from 'vitest';
import { encodeLegacyNotation, replaceWithLegacyNotation } from './legacy-notation-codec';
import { SongDocument } from './song-document';
import {
  editSongStructure,
  previewSyllableSplit,
  SongStructureHistory,
  SongStructureState,
  syllableSplitPoints,
} from './song-structure-editing';

describe('song structure editing', () => {
  it('previews valid manual syllable boundaries without creating a hyphen event', () => {
    expect(previewSyllableSplit('Twinkle,', 4)).toEqual({
      firstText: 'Twin-',
      secondText: 'kle,',
    });
    expect(syllableSplitPoints('Ab-')).toEqual([]);
    expect(previewSyllableSplit('A-b', 1)).toBeNull();
    expect(previewSyllableSplit('Hallo', 0)).toBeNull();
  });

  it('splits text and explicitly partitions existing tracks and durations without mutating source', () => {
    const document = documentFixture();
    const sourceWord = {
      text: 'Straße,',
      ...replaceWithLegacyNotation('1 5 (35)'),
      extra: { unknownWordField: { remains: true } },
    };
    const firstEvent = sourceWord.events[0];
    const secondEvent = sourceWord.events[1];
    if (firstEvent.kind === 'separator' || secondEvent.kind === 'separator') {
      throw new Error('Expected playable fixture events');
    }
    sourceWord.events[0] = { ...firstEvent, duration: 2 };
    sourceWord.events[1] = { ...secondEvent, track: 'accompaniment' };
    document.song.lines[0].words[0] = sourceWord;
    const original = structuredClone(document);

    const result = expectSuccess(
      editSongStructure(state(document), {
        kind: 'split-block',
        splitIndex: 4,
        firstEventCount: 1,
      }),
    );
    const [first, second] = result.state.document.song.lines[0].words;

    expect(first.text).toBe('Stra-');
    expect(second.text).toBe('ße,');
    expect(first.events).toEqual([sourceWord.events[0]]);
    expect(second.events).toEqual(sourceWord.events.slice(1));
    expect([...first.events, ...second.events]).toEqual(sourceWord.events);
    expect(first.extra).toEqual(sourceWord.extra);
    expect(second.extra).toEqual({});
    expect(result.state.selection).toEqual({ lineIndex: 0, wordIndex: 1 });
    expect(document).toEqual(original);
  });

  it('refuses ambiguous or fidelity-risking syllable splits without mutation', () => {
    const unknown = documentFixture();
    const unknownOriginal = structuredClone(unknown);
    expect(
      editSongStructure(state(unknown), {
        kind: 'split-block',
        splitIndex: 3,
        firstEventCount: 1,
      }),
    ).toEqual({ ok: false, reason: 'source-has-unknown-legacy-fragments' });
    expect(unknown).toEqual(unknownOriginal);

    const oneEvent = documentFixture();
    oneEvent.song.lines[0].words[0] = {
      text: 'Hallo',
      ...replaceWithLegacyNotation('1'),
      extra: {},
    };
    expect(
      editSongStructure(state(oneEvent), {
        kind: 'split-block',
        splitIndex: 2,
        firstEventCount: 1,
      }),
    ).toEqual({ ok: false, reason: 'insufficient-split-events' });

    oneEvent.song.lines[0].words[0].toneCount = 2;
    expect(
      editSongStructure(state(oneEvent), {
        kind: 'split-block',
        splitIndex: 2,
        firstEventCount: 1,
      }),
    ).toEqual({ ok: false, reason: 'unsupported-melody-split' });
  });

  it('inserts, duplicates and deletes word and melody blocks without mutating the source', () => {
    const source = documentFixture();
    const initial = state(source);

    const inserted = expectSuccess(
      editSongStructure(initial, { kind: 'insert-block', blockKind: 'word' }),
    );
    expect(inserted.state.selection).toEqual({ lineIndex: 0, wordIndex: 1 });
    expect(inserted.state.document.song.lines[0].words[1]).toMatchObject({
      text: 'Neues Wort',
      events: [],
      extra: {},
    });
    expect(source.song.lines[0].words).toHaveLength(2);

    const melody = expectSuccess(
      editSongStructure(inserted.state, { kind: 'insert-block', blockKind: 'melody' }),
    );
    expect(melody.state.document.song.lines[0].words[2]).toMatchObject({
      text: '',
      toneCount: 4,
      events: [],
    });

    const duplicated = expectSuccess(editSongStructure(initial, { kind: 'duplicate-block' }));
    const original = duplicated.state.document.song.lines[0].words[0];
    const copy = duplicated.state.document.song.lines[0].words[1];
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.extra).not.toBe(original.extra);
    expect(copy.legacyNotation.raw).toBe("1' x(");

    const deleted = expectSuccess(editSongStructure(duplicated.state, { kind: 'delete-block' }));
    expect(deleted.state.document.song.lines[0].words).toHaveLength(2);
    expect(deleted.state.selection).toEqual({ lineIndex: 0, wordIndex: 1 });
  });

  it('never permits an empty line or empty document', () => {
    const single = documentFixture();
    single.song.lines = [single.song.lines[1]];
    single.song.lines[0].words = [single.song.lines[0].words[0]];
    const initial = state(single);

    expect(editSongStructure(initial, { kind: 'delete-block' })).toEqual({
      ok: false,
      reason: 'last-block',
    });
    expect(editSongStructure(initial, { kind: 'delete-line', lineIndex: 0 })).toEqual({
      ok: false,
      reason: 'last-line',
    });
    expect(single.song.lines).toHaveLength(1);
    expect(single.song.lines[0].words).toHaveLength(1);
  });

  it('inserts, duplicates and deletes complete lines with stable selections', () => {
    const initial = state(documentFixture());
    const duplicate = expectSuccess(
      editSongStructure(initial, { kind: 'duplicate-line', lineIndex: 0 }),
    );
    expect(duplicate.state.selection).toEqual({ lineIndex: 1, wordIndex: 0 });
    expect(duplicate.state.document.song.lines[1]).toEqual(initial.document.song.lines[0]);
    expect(duplicate.state.document.song.lines[1].extra).not.toBe(
      initial.document.song.lines[0].extra,
    );

    const inserted = expectSuccess(
      editSongStructure(duplicate.state, { kind: 'insert-line', lineIndex: 1 }),
    );
    expect(inserted.state.document.song.lines[2].words[0].text).toBe('Neue Zeile');
    expect(inserted.state.selection).toEqual({ lineIndex: 2, wordIndex: 0 });

    const deleted = expectSuccess(
      editSongStructure(inserted.state, { kind: 'delete-line', lineIndex: 2 }),
    );
    expect(deleted.state.selection).toEqual({ lineIndex: 2, wordIndex: 0 });
    expect(deleted.state.document.song.lines).toHaveLength(3);
  });

  it('moves complete blocks within and between lines and reorders whole lines losslessly', () => {
    const original = documentFixture();
    const movedBetween = expectSuccess(
      editSongStructure(state(original), {
        kind: 'move-block',
        lineIndex: 0,
        wordIndex: 0,
        targetLineIndex: 1,
        targetWordIndex: 1,
      }),
    );
    expect(movedBetween.state.document.song.lines[0].words.map((word) => word.text)).toEqual([
      'Danach',
    ]);
    expect(movedBetween.state.document.song.lines[1].words.map((word) => word.text)).toEqual([
      'Zieltext',
      'Quelle',
    ]);
    expect(movedBetween.state.document.song.lines[1].words[1]).toEqual(
      original.song.lines[0].words[0],
    );
    expect(movedBetween.state.selection).toEqual({ lineIndex: 1, wordIndex: 1 });
    expect(original.song.lines[0].words.map((word) => word.text)).toEqual(['Quelle', 'Danach']);

    const movedWithin = expectSuccess(
      editSongStructure(movedBetween.state, {
        kind: 'move-block',
        lineIndex: 1,
        wordIndex: 1,
        targetLineIndex: 1,
        targetWordIndex: 0,
      }),
    );
    expect(movedWithin.state.document.song.lines[1].words.map((word) => word.text)).toEqual([
      'Quelle',
      'Zieltext',
    ]);

    const movedLine = expectSuccess(
      editSongStructure(movedWithin.state, {
        kind: 'move-line',
        lineIndex: 1,
        targetLineIndex: 0,
      }),
    );
    expect(movedLine.state.document.song.lines[0].words.map((word) => word.text)).toEqual([
      'Quelle',
      'Zieltext',
    ]);
    expect(movedLine.state.selection).toEqual({ lineIndex: 0, wordIndex: 0 });
  });

  it('never moves the only block out of a line', () => {
    const document = documentFixture();
    document.song.lines[0].words = [document.song.lines[0].words[0]];
    const before = structuredClone(document);
    expect(
      editSongStructure(state(document), {
        kind: 'move-block',
        lineIndex: 0,
        wordIndex: 0,
        targetLineIndex: 1,
        targetWordIndex: 1,
      }),
    ).toEqual({ ok: false, reason: 'last-block' });
    expect(document).toEqual(before);
  });

  it('copies only structured events into the next line and preserves target text and unknown fields', () => {
    const initial = state(documentFixture());
    const result = expectSuccess(editSongStructure(initial, { kind: 'copy-events-to-next-line' }));
    const source = initial.document.song.lines[0].words[0];
    const target = result.state.document.song.lines[1].words[0];

    expect(target.text).toBe('Zieltext');
    expect(target.extra).toEqual({ targetUnknown: ['bleibt'] });
    expect(target.toneCount).toBe(9);
    expect(target.events).toEqual(source.events);
    expect(target.events).not.toBe(source.events);
    expect(encodeLegacyNotation(target.events, target.legacyNotation)).toBe('1′');
    expect(result.state.selection).toEqual({ lineIndex: 1, wordIndex: 0 });
    expect(initial.document.song.lines[1].words[0].legacyNotation.raw).toBe('7');
  });

  it('does not overwrite unknown legacy fragments in the target block', () => {
    const document = documentFixture();
    Object.assign(document.song.lines[1].words[0], replaceWithLegacyNotation('7 x('));
    const result = editSongStructure(state(document), { kind: 'copy-events-to-next-line' });
    expect(result).toEqual({ ok: false, reason: 'target-has-unknown-legacy-fragments' });
    expect(document.song.lines[1].words[0].legacyNotation.raw).toBe('7 x(');
  });
});

describe('SongStructureHistory', () => {
  it('restores cloned snapshots in both directions and clears redo after a new edit', () => {
    const history = new SongStructureHistory();
    const first = state(documentFixture());
    const second = expectSuccess(editSongStructure(first, { kind: 'duplicate-block' })).state;
    const third = expectSuccess(editSongStructure(second, { kind: 'duplicate-block' })).state;
    history.record(first);
    history.record(second);

    third.document.song.title = 'newer in-memory title';
    const undoSecond = history.undo(third);
    expect(undoSecond?.document.song.lines[0].words).toHaveLength(3);
    expect(undoSecond?.document.song.title).toBe('Fixture');
    undoSecond!.document.song.title = 'mutated returned clone';

    const undoFirst = history.undo(undoSecond!);
    expect(undoFirst?.document.song.lines[0].words).toHaveLength(2);
    expect(undoFirst?.document.song.title).toBe('Fixture');
    expect(history.undo(undoFirst!)).toBeNull();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);

    const redoFirst = history.redo(undoFirst!);
    expect(redoFirst?.document.song.lines[0].words).toHaveLength(3);
    const redoSecond = history.redo(redoFirst!);
    expect(redoSecond?.document.song.lines[0].words).toHaveLength(4);
    expect(redoSecond?.document.song.title).toBe('newer in-memory title');
    expect(history.canRedo).toBe(false);

    history.undo(redoSecond!);
    history.record(redoFirst!);
    expect(history.canRedo).toBe(false);
  });
});

function state(document: SongDocument): SongStructureState {
  return { document, selection: { lineIndex: 0, wordIndex: 0 } };
}

function expectSuccess(result: ReturnType<typeof editSongStructure>) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected success, got ${result.reason}`);
  return result;
}

function documentFixture(): SongDocument {
  return {
    song: {
      title: 'Fixture',
      lines: [
        {
          words: [
            {
              text: 'Quelle',
              ...replaceWithLegacyNotation("1' x("),
              extra: { wordUnknown: { nested: true } },
            },
            { text: 'Danach', ...replaceWithLegacyNotation('(35)-'), extra: {} },
          ],
          extra: { lineUnknown: 'bleibt' },
        },
        {
          words: [
            {
              text: 'Zieltext',
              ...replaceWithLegacyNotation('7'),
              toneCount: 9,
              extra: { targetUnknown: ['bleibt'] },
            },
          ],
          extra: { targetLineUnknown: 2 },
        },
      ],
      extra: { songUnknown: true },
    },
    keys: [{ customKey: 'bleibt' }],
    extra: { rootUnknown: ['bleibt'] },
  };
}
