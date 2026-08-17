import { computed, inject, Injectable, signal } from '@angular/core';
import { DEFAULT_DOCUMENT } from '../../domain/default-document';
import {
  decodeLegacyNotation,
  encodeLegacyNotation,
  fidelityForEvents,
  replaceWithLegacyNotation,
} from '../../domain/legacy-notation-codec';
import {
  cloneMusicEvents,
  eventDurationInBeats,
  hasParallelTineCollision,
  MusicEvent,
  MusicTrackId,
  Pitch,
} from '../../domain/music-event';
import { cloneDocument, SongDocument } from '../../domain/song-document';
import {
  MusicSelectionClipboard,
  MusicSelectionPasteResult,
  pasteMusicSelection,
} from '../../domain/song-selection-editing';
import {
  editSongStructure,
  SongPosition,
  SongStructureAction,
  SongStructureEditResult,
  SongStructureHistory,
} from '../../domain/song-structure-editing';
import {
  LEGACY_STORAGE_KEY,
  parseLegacyV0,
  stringifyVanillaCompatible,
} from '../../infrastructure/legacy/legacy-v0.adapter';
import { BrowserSongRepository } from '../../infrastructure/persistence/song.repository';

export interface EditorValue {
  title: string;
  lines: { words: { text: string; notation: string }[] }[];
}

export type SaveStatus = 'loading' | 'saved' | 'saving' | 'error';

export type MusicEventRemovalResult =
  | { ok: true; selection: SongPosition }
  | {
      ok: false;
      reason: 'invalid-selection' | 'unknown-legacy-fragments' | 'tine-collision';
    };

@Injectable({ providedIn: 'root' })
export class SongEditorStore {
  private readonly repository = inject(BrowserSongRepository);
  private readonly documentState = signal<SongDocument | null>(null);
  private readonly statusState = signal<SaveStatus>('loading');
  private readonly errorState = signal<string | null>(null);
  private readonly hydrationVersionState = signal(0);
  private readonly canUndoState = signal(false);
  private readonly canRedoState = signal(false);
  private readonly structureHistory = new SongStructureHistory();
  private initialization?: Promise<void>;
  private lastStructureSelection: SongPosition | null = null;

  readonly document = this.documentState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly hydrationVersion = this.hydrationVersionState.asReadonly();
  readonly canUndo = this.canUndoState.asReadonly();
  readonly canRedo = this.canRedoState.asReadonly();
  readonly hasDocument = computed(() => this.documentState() !== null);

  async initialize(): Promise<void> {
    this.initialization ??= this.loadInitialDocument();
    return this.initialization;
  }

  private async loadInitialDocument(): Promise<void> {
    this.statusState.set('loading');
    this.errorState.set(null);
    try {
      const legacyJson = localStorage.getItem(LEGACY_STORAGE_KEY);
      const document = await this.repository.migrateLegacy(legacyJson, DEFAULT_DOCUMENT);
      this.documentState.set(document);
      this.clearStructureHistory();
      this.hydrationVersionState.update((version) => version + 1);
      this.statusState.set('saved');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(messageOf(error));
    }
  }

  applyStructureAction(
    action: SongStructureAction,
    selection: SongPosition,
  ): SongStructureEditResult {
    const current = this.documentState();
    if (!current) return { ok: false, reason: 'invalid-selection' };
    const result = editSongStructure({ document: current, selection }, action);
    if (!result.ok) return result;

    this.structureHistory.record({ document: current, selection });
    this.lastStructureSelection = { ...result.state.selection };
    this.syncHistoryAvailability();
    this.applyStructureSnapshot(result.state.document);
    void this.persistSnapshot(result.state.document);
    return result;
  }

  applyMusicSelectionPaste(
    clipboard: MusicSelectionClipboard,
    targets: readonly SongPosition[],
    selection: SongPosition,
  ): MusicSelectionPasteResult {
    const current = this.documentState();
    if (!current) return { ok: false, reason: 'invalid-target' };
    const result = pasteMusicSelection(current, clipboard, targets);
    if (!result.ok) return result;

    this.structureHistory.record({ document: current, selection });
    this.lastStructureSelection = { ...selection };
    this.syncHistoryAvailability();
    this.applyStructureSnapshot(result.document);
    void this.persistSnapshot(result.document);
    return result;
  }

  addMusicEvent(
    selection: SongPosition,
    event: MusicEvent,
    track: MusicTrackId,
  ): MusicEventRemovalResult {
    const current = this.documentState();
    const currentWord = current?.song.lines[selection.lineIndex]?.words[selection.wordIndex];
    if (!current || !currentWord) return { ok: false, reason: 'invalid-selection' };
    if (decodeLegacyNotation(currentWord.legacyNotation.raw).hasUnknownFragments) {
      return { ok: false, reason: 'unknown-legacy-fragments' };
    }

    const existingEvents = cloneMusicEvents(currentWord.events).map((existing) =>
      currentWord.events.some((candidate) => candidate.track !== undefined)
        ? existing
        : { ...existing, track: 'melody' as const },
    );
    const nextEvent = { ...cloneMusicEvents([event])[0], track } as MusicEvent;
    if (hasParallelTineCollision([...existingEvents, nextEvent])) {
      return { ok: false, reason: 'tine-collision' };
    }

    const document = cloneDocument(current);
    const target = document.song.lines[selection.lineIndex].words[selection.wordIndex];
    const nextEvents = [...existingEvents, nextEvent];
    const notation = encodeLegacyNotation(nextEvents);
    target.events = nextEvents;
    target.legacyNotation = fidelityForEvents(notation, nextEvents);
    this.structureHistory.record({ document: current, selection });
    this.lastStructureSelection = { ...selection };
    this.syncHistoryAvailability();
    this.applyStructureSnapshot(document);
    void this.persistSnapshot(document);
    return { ok: true, selection: { ...selection } };
  }

  removeMusicEvent(selection: SongPosition, eventIndex: number): MusicEventRemovalResult {
    const current = this.documentState();
    const currentWord = current?.song.lines[selection.lineIndex]?.words[selection.wordIndex];
    if (!current || !currentWord || eventIndex < 0 || eventIndex >= currentWord.events.length) {
      return { ok: false, reason: 'invalid-selection' };
    }
    if (decodeLegacyNotation(currentWord.legacyNotation.raw).hasUnknownFragments) {
      return { ok: false, reason: 'unknown-legacy-fragments' };
    }

    const document = cloneDocument(current);
    const nextEvents = cloneMusicEvents(
      currentWord.events.filter((_, index) => index !== eventIndex),
    );
    const notation = encodeLegacyNotation(nextEvents);
    const target = document.song.lines[selection.lineIndex].words[selection.wordIndex];
    target.events = nextEvents;
    target.legacyNotation = fidelityForEvents(notation, nextEvents);
    this.structureHistory.record({ document: current, selection });
    this.lastStructureSelection = { ...selection };
    this.syncHistoryAvailability();
    this.applyStructureSnapshot(document);
    void this.persistSnapshot(document);
    return { ok: true, selection: { ...selection } };
  }

  setMusicEventDuration(
    selection: SongPosition,
    eventIndex: number,
    durationBeats: number,
  ): MusicEventRemovalResult {
    const current = this.documentState();
    const currentWord = current?.song.lines[selection.lineIndex]?.words[selection.wordIndex];
    const currentEvent = currentWord?.events[eventIndex];
    if (
      !current ||
      !currentWord ||
      !currentEvent ||
      currentEvent.kind === 'separator' ||
      !Number.isFinite(durationBeats) ||
      durationBeats <= 0
    ) {
      return { ok: false, reason: 'invalid-selection' };
    }
    if (decodeLegacyNotation(currentWord.legacyNotation.raw).hasUnknownFragments) {
      return { ok: false, reason: 'unknown-legacy-fragments' };
    }

    const document = cloneDocument(current);
    const target = document.song.lines[selection.lineIndex].words[selection.wordIndex];
    const nextEvents = cloneMusicEvents(target.events);
    const nextEvent = nextEvents[eventIndex];
    if (nextEvent.kind === 'separator') return { ok: false, reason: 'invalid-selection' };
    nextEvent.duration = durationBeats;
    target.events = nextEvents;
    target.legacyNotation = fidelityForEvents(target.legacyNotation.raw, nextEvents);
    this.structureHistory.record({ document: current, selection });
    this.lastStructureSelection = { ...selection };
    this.syncHistoryAvailability();
    this.applyStructureSnapshot(document);
    void this.persistSnapshot(document);
    return { ok: true, selection: { ...selection } };
  }

  undoStructure(): SongPosition | null {
    const current = this.documentState();
    if (!current || !this.lastStructureSelection) return null;
    const previous = this.structureHistory.undo({
      document: current,
      selection: this.lastStructureSelection,
    });
    this.syncHistoryAvailability();
    if (!previous) return null;
    this.lastStructureSelection = { ...previous.selection };
    this.applyStructureSnapshot(previous.document);
    void this.persistSnapshot(previous.document);
    return previous.selection;
  }

  redoStructure(): SongPosition | null {
    const current = this.documentState();
    if (!current || !this.lastStructureSelection) return null;
    const next = this.structureHistory.redo({
      document: current,
      selection: this.lastStructureSelection,
    });
    this.syncHistoryAvailability();
    if (!next) return null;
    this.lastStructureSelection = { ...next.selection };
    this.applyStructureSnapshot(next.document);
    void this.persistSnapshot(next.document);
    return next.selection;
  }

  async saveEditorValue(value: EditorValue): Promise<void> {
    const candidate = this.updateEditorValue(value);
    if (!candidate) return;

    try {
      const saved = await this.repository.save(candidate);
      // Do not overwrite a newer in-memory edit when an earlier IndexedDB write finishes later.
      if (this.documentState() === candidate) {
        this.documentState.set(saved);
        this.statusState.set('saved');
      }
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(`Speichern fehlgeschlagen: ${messageOf(error)}`);
    }
  }

  updateEditorValue(value: EditorValue): SongDocument | null {
    const current = this.documentState();
    if (!current) return null;
    const candidate = cloneDocument(current);
    candidate.song.title = value.title;
    value.lines.forEach((line, lineIndex) => {
      line.words.forEach((word, wordIndex) => {
        const target = candidate.song.lines[lineIndex]?.words[wordIndex];
        if (target) {
          target.text = word.text;
          if (word.notation !== encodeLegacyNotation(target.events, target.legacyNotation)) {
            const replacement = replaceWithLegacyNotation(word.notation);
            const events = reconcileEventDurations(target.events, replacement.events);
            target.events = events;
            target.legacyNotation = fidelityForEvents(word.notation, events);
          }
        }
      });
    });

    // A non-structural edit is a newer state that an older structure snapshot must not overwrite.
    this.clearStructureHistory();
    this.documentState.set(candidate);
    this.statusState.set('saving');
    this.errorState.set(null);
    return candidate;
  }

  async importJson(json: string): Promise<void> {
    // Validation completes before the transaction, so invalid input cannot mutate the DB or signal state.
    const candidate = parseLegacyV0(json);
    this.statusState.set('saving');
    this.errorState.set(null);
    try {
      const saved = await this.repository.replace(candidate);
      this.documentState.set(saved);
      this.clearStructureHistory();
      this.hydrationVersionState.update((version) => version + 1);
      this.statusState.set('saved');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(`Import fehlgeschlagen: ${messageOf(error)}`);
      throw error;
    }
  }

  exportJson(): string {
    const current = this.documentState();
    if (!current) throw new Error('Noch kein Song geladen.');
    return stringifyVanillaCompatible(current);
  }

  setError(error: unknown): void {
    this.statusState.set('error');
    this.errorState.set(messageOf(error));
  }

  private applyStructureSnapshot(document: SongDocument): void {
    this.documentState.set(document);
    this.hydrationVersionState.update((version) => version + 1);
    this.statusState.set('saving');
    this.errorState.set(null);
  }

  private clearStructureHistory(): void {
    this.structureHistory.clear();
    this.lastStructureSelection = null;
    this.syncHistoryAvailability();
  }

  private syncHistoryAvailability(): void {
    this.canUndoState.set(this.structureHistory.canUndo);
    this.canRedoState.set(this.structureHistory.canRedo);
  }

  private async persistSnapshot(snapshot: SongDocument): Promise<void> {
    try {
      const saved = await this.repository.save(snapshot);
      // A late save must never replace a newer edit or undo snapshot in memory.
      if (this.documentState() === snapshot) {
        this.documentState.set(saved);
        this.statusState.set('saved');
      }
    } catch (error) {
      if (this.documentState() === snapshot) {
        this.statusState.set('error');
        this.errorState.set(`Speichern fehlgeschlagen: ${messageOf(error)}`);
      }
    }
  }
}

function reconcileEventDurations(
  previousEvents: readonly MusicEvent[],
  nextEvents: readonly MusicEvent[],
): MusicEvent[] {
  const remaining = cloneMusicEvents(previousEvents);
  return nextEvents.map((event) => {
    const previousIndex = remaining.findIndex((candidate) => sameEventShape(candidate, event));
    const previous = previousIndex < 0 ? undefined : remaining.splice(previousIndex, 1)[0];
    if (!previous || previous.kind === 'separator' || event.kind === 'separator') return event;
    return {
      ...event,
      duration: eventDurationInBeats(previous),
      ...(previous.track === undefined ? {} : { track: previous.track }),
    };
  });
}

function sameEventShape(left: MusicEvent, right: MusicEvent): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === 'separator' || right.kind === 'separator') return true;
  if (left.kind === 'note' && right.kind === 'note') return samePitch(left.pitch, right.pitch);
  if (left.kind !== 'chord' || right.kind !== 'chord') return false;
  return (
    left.pitches.length === right.pitches.length &&
    left.pitches.every((pitch, index) => samePitch(pitch, right.pitches[index]))
  );
}

function samePitch(left: Pitch, right: Pitch): boolean {
  return left.degree === right.degree && left.octave === right.octave;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Unbekannter Fehler';
}
