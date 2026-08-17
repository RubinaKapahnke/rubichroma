import { computed, inject, Injectable, signal } from '@angular/core';
import { createEmptySongDocument, DEFAULT_DOCUMENT } from '../../domain/default-document';
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
  parallelTineCollisionKeys,
  Pitch,
} from '../../domain/music-event';
import {
  cloneDocument,
  projectSongWordEvents,
  songWordEventsForTrack,
  SongDocument,
  SongWord,
  splitEventsIntoTracks,
} from '../../domain/song-document';
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
  createDocumentFromTextNotation,
  TextNotationImportPreview,
} from '../../domain/text-notation-import';
import {
  LEGACY_STORAGE_KEY,
  parseLegacyV0,
  stringifyVanillaCompatible,
} from '../../infrastructure/legacy/legacy-v0.adapter';
import {
  parseLocalBackup,
  serializeLocalBackup,
} from '../../infrastructure/persistence/local-backup';
import type { LocalBackupPreview } from '../../infrastructure/persistence/local-backup';
import {
  BrowserSongRepository,
  SongSummary,
} from '../../infrastructure/persistence/song.repository';

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
  private readonly activeSongIdState = signal<string | null>(null);
  private readonly songsState = signal<SongSummary[]>([]);
  private readonly statusState = signal<SaveStatus>('loading');
  private readonly errorState = signal<string | null>(null);
  private readonly hydrationVersionState = signal(0);
  private readonly canUndoState = signal(false);
  private readonly canRedoState = signal(false);
  private readonly structureHistory = new SongStructureHistory();
  private initialization?: Promise<void>;
  private lastStructureSelection: SongPosition | null = null;
  private readonly persistedDocuments = new Map<string, SongDocument>();

  readonly document = this.documentState.asReadonly();
  readonly activeSongId = this.activeSongIdState.asReadonly();
  readonly songs = this.songsState.asReadonly();
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
      const songId = await this.repository.currentSongId();
      if (!songId) throw new Error('Kein aktuelles Lied in der lokalen Ablage gefunden.');
      this.activeSongIdState.set(songId);
      this.documentState.set(document);
      this.persistedDocuments.set(songId, document);
      await this.refreshSongs();
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

    const existingEvents = projectSongWordEvents(currentWord);
    const nextEvent = { ...cloneMusicEvents([event])[0], track } as MusicEvent;
    if (hasParallelTineCollision([...existingEvents, nextEvent])) {
      return { ok: false, reason: 'tine-collision' };
    }

    const document = cloneDocument(current);
    const target = document.song.lines[selection.lineIndex].words[selection.wordIndex];
    const previousTrackOrder = trackOrderFor(target);
    const canonicalEvent = cloneMusicEvents([event])[0];
    delete canonicalEvent.track;
    trackEvents(target, track).push(canonicalEvent);
    target.legacyNotation.trackOrder = [...previousTrackOrder, track];
    updateWordFidelity(target, encodeLegacyNotation(projectSongWordEvents(target)));
    this.structureHistory.record({ document: current, selection });
    this.lastStructureSelection = { ...selection };
    this.syncHistoryAvailability();
    this.applyStructureSnapshot(document);
    void this.persistSnapshot(document);
    return { ok: true, selection: { ...selection } };
  }

  replaceMusicTracks(
    selection: SongPosition,
    replacements: Partial<Record<MusicTrackId, readonly MusicEvent[]>>,
  ): MusicEventRemovalResult {
    const current = this.documentState();
    const currentWord = current?.song.lines[selection.lineIndex]?.words[selection.wordIndex];
    if (!current || !currentWord || Object.keys(replacements).length === 0) {
      return { ok: false, reason: 'invalid-selection' };
    }
    if (decodeLegacyNotation(currentWord.legacyNotation.raw).hasUnknownFragments) {
      return { ok: false, reason: 'unknown-legacy-fragments' };
    }

    const document = cloneDocument(current);
    const target = document.song.lines[selection.lineIndex].words[selection.wordIndex];
    for (const track of ['melody', 'accompaniment'] as const) {
      const events = replacements[track];
      if (!events) continue;
      const canonical = cloneMusicEvents(events);
      canonical.forEach((event) => delete event.track);
      if (track === 'melody') target.melodyEvents = canonical;
      else target.accompanimentEvents = canonical;
    }

    const previousCollisions = parallelTineCollisionKeys(projectSongWordEvents(currentWord));
    const nextEvents = projectSongWordEvents(target);
    const introducesCollision = [...parallelTineCollisionKeys(nextEvents)].some(
      (key) => !previousCollisions.has(key),
    );
    if (introducesCollision) return { ok: false, reason: 'tine-collision' };

    updateWordFidelity(target, encodeLegacyNotation(nextEvents));
    this.structureHistory.record({ document: current, selection });
    this.lastStructureSelection = { ...selection };
    this.syncHistoryAvailability();
    this.applyStructureSnapshot(document);
    void this.persistSnapshot(document);
    return { ok: true, selection: { ...selection } };
  }

  removeMusicEvent(
    selection: SongPosition,
    track: MusicTrackId,
    eventIndex: number,
  ): MusicEventRemovalResult {
    const current = this.documentState();
    const currentWord = current?.song.lines[selection.lineIndex]?.words[selection.wordIndex];
    const currentTrackEvents = currentWord ? songWordEventsForTrack(currentWord, track) : [];
    if (!current || !currentWord || eventIndex < 0 || eventIndex >= currentTrackEvents.length) {
      return { ok: false, reason: 'invalid-selection' };
    }
    if (decodeLegacyNotation(currentWord.legacyNotation.raw).hasUnknownFragments) {
      return { ok: false, reason: 'unknown-legacy-fragments' };
    }

    const document = cloneDocument(current);
    const target = document.song.lines[selection.lineIndex].words[selection.wordIndex];
    removeTrackOrderEntry(target, track, eventIndex);
    trackEvents(target, track).splice(eventIndex, 1);
    updateWordFidelity(target, encodeLegacyNotation(projectSongWordEvents(target)));
    this.structureHistory.record({ document: current, selection });
    this.lastStructureSelection = { ...selection };
    this.syncHistoryAvailability();
    this.applyStructureSnapshot(document);
    void this.persistSnapshot(document);
    return { ok: true, selection: { ...selection } };
  }

  setMusicEventDuration(
    selection: SongPosition,
    track: MusicTrackId,
    eventIndex: number,
    durationBeats: number,
  ): MusicEventRemovalResult {
    const current = this.documentState();
    const currentWord = current?.song.lines[selection.lineIndex]?.words[selection.wordIndex];
    const currentEvent = currentWord
      ? songWordEventsForTrack(currentWord, track)[eventIndex]
      : null;
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
    const nextEvents = cloneMusicEvents(songWordEventsForTrack(target, track));
    const nextEvent = nextEvents[eventIndex];
    if (nextEvent.kind === 'separator') return { ok: false, reason: 'invalid-selection' };
    nextEvent.duration = durationBeats;
    if (track === 'melody') target.melodyEvents = nextEvents;
    else target.accompanimentEvents = nextEvents;
    updateWordFidelity(target, target.legacyNotation.raw);
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

  async saveEditorValue(value: EditorValue, selection?: SongPosition | null): Promise<void> {
    const candidate = this.updateEditorValue(value, selection);
    if (!candidate) return;
    const songId = this.activeSongIdState();
    if (!songId) {
      this.statusState.set('error');
      this.errorState.set('Speichern fehlgeschlagen: Kein aktuelles Lied ausgewählt.');
      return;
    }
    if (this.persistedDocuments.get(songId) === candidate) {
      this.statusState.set('saved');
      return;
    }

    try {
      const saved = await this.repository.save(candidate, songId);
      this.persistedDocuments.set(songId, saved);
      await this.refreshSongs();
      // Do not overwrite a newer in-memory edit when an earlier IndexedDB write finishes later.
      if (this.activeSongIdState() === songId && this.documentState() === candidate) {
        this.documentState.set(saved);
        this.statusState.set('saved');
      }
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(`Speichern fehlgeschlagen: ${messageOf(error)}`);
    }
  }

  updateEditorValue(value: EditorValue, selection?: SongPosition | null): SongDocument | null {
    const current = this.documentState();
    if (!current) return null;
    if (matchesEditorValue(current, value)) return current;
    const candidate = cloneDocument(current);
    candidate.song.title = value.title;
    value.lines.forEach((line, lineIndex) => {
      line.words.forEach((word, wordIndex) => {
        const target = candidate.song.lines[lineIndex]?.words[wordIndex];
        if (target) {
          target.text = word.text;
          const currentEvents = projectSongWordEvents(target);
          if (word.notation !== encodeLegacyNotation(currentEvents, target.legacyNotation)) {
            const replacement = replaceWithLegacyNotation(word.notation);
            const events = reconcileEventMetadata(currentEvents, replacement.events);
            const split = splitEventsIntoTracks(events);
            target.melodyEvents = split.melodyEvents;
            target.accompanimentEvents = split.accompanimentEvents;
            target.legacyNotation = {
              ...fidelityForEvents(word.notation, events),
              trackOrder: split.trackOrder,
              ...(target.legacyNotation.trackMetadataExplicit ||
              split.accompanimentEvents.length > 0
                ? { trackMetadataExplicit: true }
                : {}),
            };
          }
        }
      });
    });

    const historySelection = selection ?? this.lastStructureSelection ?? firstSongPosition(current);
    if (historySelection) {
      this.structureHistory.record({ document: current, selection: historySelection });
      this.lastStructureSelection = { ...historySelection };
      this.syncHistoryAvailability();
    }
    this.documentState.set(candidate);
    this.statusState.set('saving');
    this.errorState.set(null);
    return candidate;
  }

  async importJson(json: string): Promise<void> {
    // Validation completes before the transaction, so invalid input cannot mutate the DB or signal state.
    const candidate = parseLegacyV0(json);
    const songId = this.activeSongIdState();
    if (!songId) throw new Error('Kein aktuelles Lied für den Import ausgewählt.');
    this.statusState.set('saving');
    this.errorState.set(null);
    try {
      const saved = await this.repository.replace(candidate, songId);
      if (this.activeSongIdState() !== songId) return;
      this.documentState.set(saved);
      this.persistedDocuments.set(songId, saved);
      await this.refreshSongs();
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

  inspectLocalBackup(json: string): LocalBackupPreview {
    return parseLocalBackup(json);
  }

  async exportLocalBackupJson(): Promise<string> {
    return serializeLocalBackup(await this.repository.exportLocalBackupSnapshot());
  }

  async restoreLocalBackup(preview: LocalBackupPreview): Promise<void> {
    this.statusState.set('saving');
    this.errorState.set(null);
    try {
      const restored = await this.repository.restoreLocalBackupSnapshot(preview.snapshot);
      const songId = await this.repository.currentSongId();
      if (!songId) throw new Error('Die Sicherung enthält kein aktuell geöffnetes Lied.');
      this.activeSongIdState.set(songId);
      this.documentState.set(restored);
      this.persistedDocuments.clear();
      this.persistedDocuments.set(songId, restored);
      await this.refreshSongs();
      this.clearStructureHistory();
      this.hydrationVersionState.update((version) => version + 1);
      this.statusState.set('saved');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(`Wiederherstellung fehlgeschlagen: ${messageOf(error)}`);
      throw error;
    }
  }

  async importLocalBackupAsNewSong(preview: LocalBackupPreview): Promise<void> {
    this.statusState.set('saving');
    this.errorState.set(null);
    try {
      const imported = await this.repository.importLocalBackupAsNewSong(preview.snapshot);
      this.activeSongIdState.set(imported.id);
      this.documentState.set(imported.document);
      this.persistedDocuments.set(imported.id, imported.document);
      await this.refreshSongs();
      this.clearStructureHistory();
      this.hydrationVersionState.update((version) => version + 1);
      this.statusState.set('saved');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(`Import als neues Lied fehlgeschlagen: ${messageOf(error)}`);
      throw error;
    }
  }

  setError(error: unknown): void {
    this.statusState.set('error');
    this.errorState.set(messageOf(error));
  }

  async openSong(songId: string): Promise<void> {
    if (songId === this.activeSongIdState()) return;
    this.statusState.set('loading');
    this.errorState.set(null);
    try {
      const document = await this.repository.openSong(songId);
      this.activeSongIdState.set(songId);
      this.documentState.set(document);
      this.persistedDocuments.set(songId, document);
      this.clearStructureHistory();
      this.hydrationVersionState.update((version) => version + 1);
      this.statusState.set('saved');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(`Liedwechsel fehlgeschlagen: ${messageOf(error)}`);
      throw error;
    }
  }

  async createNewSong(): Promise<void> {
    this.statusState.set('loading');
    this.errorState.set(null);
    try {
      const stored = await this.repository.createSong(createEmptySongDocument());
      this.activeSongIdState.set(stored.id);
      this.documentState.set(stored.document);
      this.persistedDocuments.set(stored.id, stored.document);
      await this.refreshSongs();
      this.clearStructureHistory();
      this.hydrationVersionState.update((version) => version + 1);
      this.statusState.set('saved');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(`Neues Lied konnte nicht angelegt werden: ${messageOf(error)}`);
      throw error;
    }
  }

  async importTextNotation(preview: TextNotationImportPreview): Promise<void> {
    // Build and validate the complete candidate before opening the repository transaction.
    const document = createDocumentFromTextNotation(preview);
    this.statusState.set('saving');
    this.errorState.set(null);
    try {
      const stored = await this.repository.createSong(document);
      this.activeSongIdState.set(stored.id);
      this.documentState.set(stored.document);
      this.persistedDocuments.set(stored.id, stored.document);
      await this.refreshSongs();
      this.clearStructureHistory();
      this.hydrationVersionState.update((version) => version + 1);
      this.statusState.set('saved');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(`Textnotation konnte nicht importiert werden: ${messageOf(error)}`);
      throw error;
    }
  }

  async renameSong(songId: string, title: string): Promise<void> {
    this.statusState.set('saving');
    this.errorState.set(null);
    try {
      const stored = await this.repository.renameSong(songId, title);
      this.persistedDocuments.set(songId, stored.document);
      if (this.activeSongIdState() === songId) {
        this.documentState.set(stored.document);
        this.clearStructureHistory();
        this.hydrationVersionState.update((version) => version + 1);
      }
      await this.refreshSongs();
      this.statusState.set('saved');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(`Lied konnte nicht umbenannt werden: ${messageOf(error)}`);
      throw error;
    }
  }

  async duplicateSong(songId: string): Promise<void> {
    this.statusState.set('saving');
    this.errorState.set(null);
    try {
      const stored = await this.repository.duplicateSong(songId);
      this.persistedDocuments.set(stored.id, stored.document);
      await this.refreshSongs();
      this.statusState.set('saved');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(`Lied konnte nicht dupliziert werden: ${messageOf(error)}`);
      throw error;
    }
  }

  async duplicateSongAsVariant(songId: string, variantName: string): Promise<void> {
    this.statusState.set('saving');
    this.errorState.set(null);
    try {
      const stored = await this.repository.duplicateSongAsVariant(songId, variantName);
      this.persistedDocuments.set(stored.id, stored.document);
      await this.refreshSongs();
      this.statusState.set('saved');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(`Variante konnte nicht angelegt werden: ${messageOf(error)}`);
      throw error;
    }
  }

  async renameVariant(songId: string, variantName: string): Promise<void> {
    this.statusState.set('saving');
    this.errorState.set(null);
    try {
      await this.repository.renameVariant(songId, variantName);
      await this.refreshSongs();
      this.statusState.set('saved');
    } catch (error) {
      this.statusState.set('error');
      this.errorState.set(`Variantenname konnte nicht geändert werden: ${messageOf(error)}`);
      throw error;
    }
  }

  private async refreshSongs(): Promise<void> {
    this.songsState.set(await this.repository.listSongs());
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
    const songId = this.activeSongIdState();
    if (!songId) return;
    try {
      const saved = await this.repository.save(snapshot, songId);
      this.persistedDocuments.set(songId, saved);
      await this.refreshSongs();
      // A late save must never replace a newer edit or undo snapshot in memory.
      if (this.activeSongIdState() === songId && this.documentState() === snapshot) {
        this.documentState.set(saved);
        this.statusState.set('saved');
      }
    } catch (error) {
      if (this.activeSongIdState() === songId && this.documentState() === snapshot) {
        this.statusState.set('error');
        this.errorState.set(`Speichern fehlgeschlagen: ${messageOf(error)}`);
      }
    }
  }
}

function matchesEditorValue(document: SongDocument, value: EditorValue): boolean {
  if (document.song.title !== value.title || document.song.lines.length !== value.lines.length) {
    return false;
  }
  return document.song.lines.every((line, lineIndex) => {
    const valueLine = value.lines[lineIndex];
    if (!valueLine || line.words.length !== valueLine.words.length) return false;
    return line.words.every((word, wordIndex) => {
      const valueWord = valueLine.words[wordIndex];
      return (
        !!valueWord &&
        word.text === valueWord.text &&
        encodeLegacyNotation(projectSongWordEvents(word), word.legacyNotation) ===
          valueWord.notation
      );
    });
  });
}

function firstSongPosition(document: SongDocument): SongPosition | null {
  const lineIndex = document.song.lines.findIndex((line) => line.words.length > 0);
  return lineIndex < 0 ? null : { lineIndex, wordIndex: 0 };
}

function reconcileEventMetadata(
  previousEvents: readonly MusicEvent[],
  nextEvents: readonly MusicEvent[],
): MusicEvent[] {
  const remaining = cloneMusicEvents(previousEvents);
  return nextEvents.map((event) => {
    const previousIndex = remaining.findIndex((candidate) => sameEventShape(candidate, event));
    const previous = previousIndex < 0 ? undefined : remaining.splice(previousIndex, 1)[0];
    if (!previous) return { ...event, track: 'melody' };
    if (previous.kind === 'separator' || event.kind === 'separator') {
      return { ...event, track: previous.track ?? 'melody' };
    }
    return {
      ...event,
      duration: eventDurationInBeats(previous),
      ...(previous.track === undefined ? {} : { track: previous.track }),
    };
  });
}

function trackEvents(word: SongWord, track: MusicTrackId): MusicEvent[] {
  return track === 'melody' ? word.melodyEvents : word.accompanimentEvents;
}

function trackOrderFor(word: SongWord): MusicTrackId[] {
  return projectSongWordEvents(word).map((event) => event.track ?? 'melody');
}

function removeTrackOrderEntry(word: SongWord, track: MusicTrackId, trackIndex: number): void {
  const order = trackOrderFor(word);
  let seen = -1;
  const orderIndex = order.findIndex((candidate) => {
    if (candidate !== track) return false;
    seen += 1;
    return seen === trackIndex;
  });
  if (orderIndex >= 0) order.splice(orderIndex, 1);
  word.legacyNotation.trackOrder = order;
}

function updateWordFidelity(word: SongWord, raw: string): void {
  const events = projectSongWordEvents(word);
  const trackMetadataExplicit =
    word.legacyNotation.trackMetadataExplicit || word.accompanimentEvents.length > 0;
  word.legacyNotation = {
    ...fidelityForEvents(raw, events),
    trackOrder: events.map((event) => event.track ?? 'melody'),
    ...(trackMetadataExplicit ? { trackMetadataExplicit: true } : {}),
  };
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
