import {
  decodeLegacyNotation,
  encodeLegacyNotation,
  fidelityForEvents,
  replaceWithLegacyNotation,
} from './legacy-notation-codec';
import { cloneMusicEvents, MusicEvent } from './music-event';
import { cloneDocument, SongDocument, SongLine, SongWord } from './song-document';

export interface SongPosition {
  lineIndex: number;
  wordIndex: number;
}

export interface SongStructureState {
  document: SongDocument;
  selection: SongPosition;
}

export type SongStructureAction =
  | { kind: 'insert-block'; blockKind: 'word' | 'melody' }
  | { kind: 'split-block'; splitIndex: number; firstEventCount: number }
  | { kind: 'delete-block' }
  | { kind: 'duplicate-block' }
  | { kind: 'insert-line'; lineIndex: number }
  | { kind: 'delete-line'; lineIndex: number }
  | { kind: 'duplicate-line'; lineIndex: number }
  | { kind: 'copy-events-to-next-line'; targetWordIndex?: number };

export type SongStructureEditResult =
  | { ok: true; state: SongStructureState; message: string }
  | {
      ok: false;
      reason:
        | 'invalid-selection'
        | 'last-block'
        | 'last-line'
        | 'missing-next-line'
        | 'missing-target-block'
        | 'invalid-syllable-split'
        | 'insufficient-split-events'
        | 'unsupported-melody-split'
        | 'source-has-unknown-legacy-fragments'
        | 'target-has-unknown-legacy-fragments';
    };

export class SongStructureHistory {
  private readonly undoSnapshots: SongStructureState[] = [];
  private readonly redoSnapshots: SongStructureState[] = [];

  constructor(private readonly limit = 50) {}

  get canUndo(): boolean {
    return this.undoSnapshots.length > 0;
  }

  get canRedo(): boolean {
    return this.redoSnapshots.length > 0;
  }

  get depth(): number {
    return this.undoSnapshots.length;
  }

  record(state: SongStructureState): void {
    this.push(this.undoSnapshots, state);
    this.redoSnapshots.length = 0;
  }

  undo(current: SongStructureState): SongStructureState | null {
    const snapshot = this.undoSnapshots.pop();
    if (!snapshot) return null;
    this.push(this.redoSnapshots, current);
    return cloneState(snapshot);
  }

  redo(current: SongStructureState): SongStructureState | null {
    const snapshot = this.redoSnapshots.pop();
    if (!snapshot) return null;
    this.push(this.undoSnapshots, current);
    return snapshot ? cloneState(snapshot) : null;
  }

  clear(): void {
    this.undoSnapshots.length = 0;
    this.redoSnapshots.length = 0;
  }

  private push(stack: SongStructureState[], state: SongStructureState): void {
    stack.push(cloneState(state));
    if (stack.length > this.limit) stack.shift();
  }
}

export function editSongStructure(
  state: SongStructureState,
  action: SongStructureAction,
): SongStructureEditResult {
  const selectedWord = wordAt(state.document, state.selection);
  if (!selectedWord) return { ok: false, reason: 'invalid-selection' };

  const document = cloneDocument(state.document);
  let selection = { ...state.selection };

  switch (action.kind) {
    case 'insert-block': {
      const words = document.song.lines[selection.lineIndex].words;
      words.splice(selection.wordIndex + 1, 0, createBlock(action.blockKind));
      selection.wordIndex += 1;
      return success(
        document,
        selection,
        action.blockKind === 'word' ? 'Wort hinzugefügt' : 'Melodieblock hinzugefügt',
      );
    }
    case 'split-block': {
      if (selectedWord.toneCount !== undefined) {
        return { ok: false, reason: 'unsupported-melody-split' };
      }
      const preview = previewSyllableSplit(selectedWord.text, action.splitIndex);
      if (!preview) return { ok: false, reason: 'invalid-syllable-split' };
      if (decodeLegacyNotation(selectedWord.legacyNotation.raw).hasUnknownFragments) {
        return { ok: false, reason: 'source-has-unknown-legacy-fragments' };
      }
      const firstEvents = selectedWord.events.slice(0, action.firstEventCount);
      const secondEvents = selectedWord.events.slice(action.firstEventCount);
      if (!hasPlayableEvent(firstEvents) || !hasPlayableEvent(secondEvents)) {
        return { ok: false, reason: 'insufficient-split-events' };
      }

      const words = document.song.lines[selection.lineIndex].words;
      const first = words[selection.wordIndex];
      const firstClones = cloneMusicEvents(firstEvents);
      const secondClones = cloneMusicEvents(secondEvents);
      first.text = preview.firstText;
      first.events = firstClones;
      first.legacyNotation = fidelityForEvents(encodeLegacyNotation(firstClones), firstClones);
      words.splice(selection.wordIndex + 1, 0, {
        text: preview.secondText,
        events: secondClones,
        legacyNotation: fidelityForEvents(encodeLegacyNotation(secondClones), secondClones),
        extra: {},
      });
      selection.wordIndex += 1;
      return success(
        document,
        selection,
        `Silbe geteilt · ${firstEvents.length} / ${secondEvents.length} Ereignisse zugeordnet`,
      );
    }
    case 'delete-block': {
      const words = document.song.lines[selection.lineIndex].words;
      if (words.length === 1) return { ok: false, reason: 'last-block' };
      words.splice(selection.wordIndex, 1);
      selection.wordIndex = Math.min(selection.wordIndex, words.length - 1);
      return success(document, selection, 'Block gelöscht');
    }
    case 'duplicate-block': {
      const words = document.song.lines[selection.lineIndex].words;
      words.splice(selection.wordIndex + 1, 0, cloneWord(words[selection.wordIndex]));
      selection.wordIndex += 1;
      return success(document, selection, 'Block vollständig dupliziert');
    }
    case 'insert-line': {
      if (!document.song.lines[action.lineIndex]) return { ok: false, reason: 'invalid-selection' };
      document.song.lines.splice(action.lineIndex + 1, 0, createLine());
      selection = { lineIndex: action.lineIndex + 1, wordIndex: 0 };
      return success(document, selection, 'Liedzeile hinzugefügt');
    }
    case 'delete-line': {
      if (!document.song.lines[action.lineIndex]) return { ok: false, reason: 'invalid-selection' };
      if (document.song.lines.length === 1) return { ok: false, reason: 'last-line' };
      document.song.lines.splice(action.lineIndex, 1);
      const lineIndex = Math.min(action.lineIndex, document.song.lines.length - 1);
      selection = { lineIndex, wordIndex: 0 };
      return success(document, selection, 'Liedzeile gelöscht');
    }
    case 'duplicate-line': {
      const line = document.song.lines[action.lineIndex];
      if (!line) return { ok: false, reason: 'invalid-selection' };
      document.song.lines.splice(action.lineIndex + 1, 0, cloneLine(line));
      selection = { lineIndex: action.lineIndex + 1, wordIndex: 0 };
      return success(document, selection, 'Liedzeile vollständig dupliziert');
    }
    case 'copy-events-to-next-line': {
      const targetLine = document.song.lines[selection.lineIndex + 1];
      if (!targetLine) return { ok: false, reason: 'missing-next-line' };
      const targetWordIndex =
        action.targetWordIndex ?? Math.min(selection.wordIndex, targetLine.words.length - 1);
      const target = targetLine.words[targetWordIndex];
      if (!target) return { ok: false, reason: 'missing-target-block' };
      const targetNotation = encodeLegacyNotation(target.events, target.legacyNotation);
      if (decodeLegacyNotation(targetNotation).hasUnknownFragments) {
        return { ok: false, reason: 'target-has-unknown-legacy-fragments' };
      }

      const source = document.song.lines[selection.lineIndex].words[selection.wordIndex];
      const replacement = replaceWithLegacyNotation(encodeLegacyNotation(source.events));
      target.events = cloneMusicEvents(replacement.events);
      target.legacyNotation = { ...replacement.legacyNotation };
      selection = { lineIndex: selection.lineIndex + 1, wordIndex: targetWordIndex };
      return success(document, selection, 'Musikereignisse in die nächste Zeile übertragen');
    }
  }
}

export interface SyllableSplitPreview {
  firstText: string;
  secondText: string;
}

export function previewSyllableSplit(
  text: string,
  splitIndex: number,
): SyllableSplitPreview | null {
  const normalized = text.trim();
  if (
    !Number.isInteger(splitIndex) ||
    splitIndex <= 0 ||
    splitIndex >= normalized.length ||
    normalized.endsWith('-') ||
    normalized[splitIndex - 1] === '-' ||
    normalized[splitIndex] === '-' ||
    !/[\p{L}\p{M}]/u.test(normalized[splitIndex - 1]) ||
    !/[\p{L}\p{M}]/u.test(normalized[splitIndex])
  ) {
    return null;
  }
  return {
    firstText: `${normalized.slice(0, splitIndex)}-`,
    secondText: normalized.slice(splitIndex),
  };
}

export function syllableSplitPoints(text: string): number[] {
  const normalized = text.trim();
  return Array.from({ length: Math.max(0, normalized.length - 1) }, (_, index) => index + 1).filter(
    (splitIndex) => previewSyllableSplit(normalized, splitIndex) !== null,
  );
}

function hasPlayableEvent(events: readonly MusicEvent[]): boolean {
  return events.some((event) => event.kind !== 'separator');
}

function success(
  document: SongDocument,
  selection: SongPosition,
  message: string,
): SongStructureEditResult {
  return { ok: true, state: { document, selection }, message };
}

function createBlock(kind: 'word' | 'melody'): SongWord {
  return {
    text: kind === 'word' ? 'Neues Wort' : '',
    ...replaceWithLegacyNotation(''),
    ...(kind === 'melody' ? { toneCount: 4 } : {}),
    extra: {},
  };
}

function createLine(): SongLine {
  return {
    words: [{ text: 'Neue Zeile', ...replaceWithLegacyNotation(''), extra: {} }],
    extra: {},
  };
}

function cloneWord(word: SongWord): SongWord {
  const document: SongDocument = {
    song: { title: '', lines: [{ words: [word], extra: {} }], extra: {} },
    keys: [],
    extra: {},
  };
  return cloneDocument(document).song.lines[0].words[0];
}

function cloneLine(line: SongLine): SongLine {
  const document: SongDocument = {
    song: { title: '', lines: [line], extra: {} },
    keys: [],
    extra: {},
  };
  return cloneDocument(document).song.lines[0];
}

function wordAt(document: SongDocument, position: SongPosition): SongWord | undefined {
  return document.song.lines[position.lineIndex]?.words[position.wordIndex];
}

function cloneState(state: SongStructureState): SongStructureState {
  return { document: cloneDocument(state.document), selection: { ...state.selection } };
}
