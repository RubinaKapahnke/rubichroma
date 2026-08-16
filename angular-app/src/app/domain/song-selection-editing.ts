import {
  decodeLegacyNotation,
  encodeLegacyNotation,
  replaceWithLegacyNotation,
} from './legacy-notation-codec';
import { cloneMusicEvents, MusicEvent } from './music-event';
import { cloneDocument, SongDocument, SongWord } from './song-document';
import { SongPosition } from './song-structure-editing';

export type SongSelectionMode = 'single' | 'range' | 'toggle';

export interface SongSelectionState {
  positions: SongPosition[];
  anchor: SongPosition | null;
  active: SongPosition | null;
}

export interface MusicSelectionClipboard {
  sequences: MusicEvent[][];
}

export type MusicSelectionPasteResult =
  | { ok: true; document: SongDocument; message: string }
  | {
      ok: false;
      reason:
        | 'empty-clipboard'
        | 'selection-count-mismatch'
        | 'invalid-target'
        | 'target-has-unknown-legacy-fragments';
    };

export const EMPTY_SONG_SELECTION: SongSelectionState = {
  positions: [],
  anchor: null,
  active: null,
};

export function updateSongSelection(
  document: SongDocument,
  state: SongSelectionState,
  target: SongPosition,
  mode: SongSelectionMode,
): SongSelectionState {
  const ordered = songPositions(document);
  const targetIndex = indexOfPosition(ordered, target);
  if (targetIndex < 0) return normalizeSongSelection(document, state);

  if (mode === 'single') {
    return { positions: [{ ...target }], anchor: { ...target }, active: { ...target } };
  }

  if (mode === 'range') {
    const anchor = validPosition(ordered, state.anchor ?? state.active) ?? target;
    const anchorIndex = indexOfPosition(ordered, anchor);
    const [start, end] = [anchorIndex, targetIndex].sort((left, right) => left - right);
    return {
      positions: ordered.slice(start, end + 1).map(clonePosition),
      anchor: clonePosition(anchor),
      active: clonePosition(target),
    };
  }

  const selectedKeys = new Set(state.positions.map(positionKey));
  const targetKey = positionKey(target);
  if (selectedKeys.has(targetKey)) selectedKeys.delete(targetKey);
  else selectedKeys.add(targetKey);
  const positions = ordered.filter((position) => selectedKeys.has(positionKey(position)));

  return {
    positions: positions.map(clonePosition),
    anchor: clonePosition(target),
    active: positions.some((position) => samePosition(position, target))
      ? clonePosition(target)
      : positions.at(-1)
        ? clonePosition(positions.at(-1)!)
        : null,
  };
}

export function normalizeSongSelection(
  document: SongDocument,
  state: SongSelectionState,
): SongSelectionState {
  const ordered = songPositions(document);
  const selectedKeys = new Set(state.positions.map(positionKey));
  const positions = ordered.filter((position) => selectedKeys.has(positionKey(position)));
  if (positions.length === 0) return { ...EMPTY_SONG_SELECTION };

  const active = validPosition(positions, state.active) ?? positions.at(-1)!;
  const anchor = validPosition(ordered, state.anchor) ?? active;
  return {
    positions: positions.map(clonePosition),
    anchor: clonePosition(anchor),
    active: clonePosition(active),
  };
}

export function createMusicSelectionClipboard(
  document: SongDocument,
  positions: readonly SongPosition[],
): MusicSelectionClipboard | null {
  const ordered = selectedPositionsInSongOrder(document, positions);
  if (ordered.length === 0 || ordered.length !== positions.length) return null;

  return {
    sequences: ordered.map((position) =>
      cloneMusicEvents(wordAt(document, position)!.events.filter(isNoteOrChord)),
    ),
  };
}

export function pasteMusicSelection(
  source: SongDocument,
  clipboard: MusicSelectionClipboard,
  targetPositions: readonly SongPosition[],
): MusicSelectionPasteResult {
  if (clipboard.sequences.length === 0) return { ok: false, reason: 'empty-clipboard' };

  const orderedTargets = selectedPositionsInSongOrder(source, targetPositions);
  if (
    orderedTargets.length !== targetPositions.length ||
    orderedTargets.length !== clipboard.sequences.length
  ) {
    return { ok: false, reason: 'selection-count-mismatch' };
  }

  const document = cloneDocument(source);
  for (const [index, position] of orderedTargets.entries()) {
    const target = wordAt(document, position);
    if (!target) return { ok: false, reason: 'invalid-target' };
    const targetNotation = encodeLegacyNotation(target.events, target.legacyNotation);
    if (decodeLegacyNotation(targetNotation).hasUnknownFragments) {
      return { ok: false, reason: 'target-has-unknown-legacy-fragments' };
    }

    const nextEvents = replaceNoteChordEvents(target.events, clipboard.sequences[index]);
    Object.assign(target, replaceWithLegacyNotation(encodeLegacyNotation(nextEvents)));
  }

  return {
    ok: true,
    document,
    message: `Noten/Akkorde in ${orderedTargets.length} ${orderedTargets.length === 1 ? 'Zielblock' : 'Zielblöcke'} eingefügt`,
  };
}

export function songPositions(document: SongDocument): SongPosition[] {
  return document.song.lines.flatMap((line, lineIndex) =>
    line.words.map((_, wordIndex) => ({ lineIndex, wordIndex })),
  );
}

function selectedPositionsInSongOrder(
  document: SongDocument,
  positions: readonly SongPosition[],
): SongPosition[] {
  const selectedKeys = new Set(positions.map(positionKey));
  return songPositions(document).filter((position) => selectedKeys.has(positionKey(position)));
}

function replaceNoteChordEvents(
  targetEvents: readonly MusicEvent[],
  sourceEvents: readonly MusicEvent[],
): MusicEvent[] {
  const source = cloneMusicEvents(sourceEvents.filter(isNoteOrChord));
  let sourceIndex = 0;
  const next: MusicEvent[] = [];

  for (const event of targetEvents) {
    if (isNoteOrChord(event)) {
      const replacement = source[sourceIndex];
      if (replacement) next.push(replacement);
      sourceIndex += 1;
    } else {
      next.push({ kind: 'separator' });
    }
  }

  next.push(...source.slice(sourceIndex));
  return next;
}

function wordAt(document: SongDocument, position: SongPosition): SongWord | undefined {
  return document.song.lines[position.lineIndex]?.words[position.wordIndex];
}

function validPosition(
  positions: readonly SongPosition[],
  candidate: SongPosition | null,
): SongPosition | null {
  if (!candidate) return null;
  return positions.find((position) => samePosition(position, candidate)) ?? null;
}

function indexOfPosition(positions: readonly SongPosition[], target: SongPosition): number {
  return positions.findIndex((position) => samePosition(position, target));
}

function isNoteOrChord(
  event: MusicEvent,
): event is Extract<MusicEvent, { kind: 'note' | 'chord' }> {
  return event.kind === 'note' || event.kind === 'chord';
}

function samePosition(left: SongPosition, right: SongPosition): boolean {
  return left.lineIndex === right.lineIndex && left.wordIndex === right.wordIndex;
}

function positionKey(position: SongPosition): string {
  return `${position.lineIndex}:${position.wordIndex}`;
}

function clonePosition(position: SongPosition): SongPosition {
  return { ...position };
}
