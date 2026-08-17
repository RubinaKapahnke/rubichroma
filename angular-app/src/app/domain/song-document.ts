import { cloneJson, JsonObject } from './json-value';
import {
  cloneLegacyNotationFidelity,
  fidelityForEvents,
  LegacyNotationFidelity,
  replaceWithLegacyNotation,
} from './legacy-notation-codec';
import { cloneMusicEvents, MusicEvent, MusicTrackId } from './music-event';

export interface SongWord {
  text: string;
  melodyEvents: MusicEvent[];
  accompanimentEvents: MusicEvent[];
  legacyNotation: LegacyNotationFidelity;
  toneCount?: number;
  extra: JsonObject;
}

export interface SongLine {
  words: SongWord[];
  extra: JsonObject;
}

export interface Song {
  title: string;
  lines: SongLine[];
  extra: JsonObject;
}

export interface SongDocument {
  song: Song;
  keys: JsonObject[];
  extra: JsonObject;
}

export function cloneDocument(document: SongDocument): SongDocument {
  return {
    song: {
      title: document.song.title,
      lines: document.song.lines.map((line) => ({
        words: line.words.map((word) => ({
          text: word.text,
          melodyEvents: cloneCanonicalEvents(word.melodyEvents),
          accompanimentEvents: cloneCanonicalEvents(word.accompanimentEvents),
          legacyNotation: cloneLegacyNotationFidelity(word.legacyNotation),
          ...(word.toneCount === undefined ? {} : { toneCount: word.toneCount }),
          extra: cloneJson(word.extra),
        })),
        extra: cloneJson(line.extra),
      })),
      extra: cloneJson(document.song.extra),
    },
    keys: document.keys.map((key) => cloneJson(key)),
    extra: cloneJson(document.extra),
  };
}

export interface SongWordTracks {
  melodyEvents: MusicEvent[];
  accompanimentEvents: MusicEvent[];
  trackOrder: MusicTrackId[];
}

export function splitEventsIntoTracks(events: readonly MusicEvent[]): SongWordTracks {
  const melodyEvents: MusicEvent[] = [];
  const accompanimentEvents: MusicEvent[] = [];
  const trackOrder: MusicTrackId[] = [];
  for (const event of cloneMusicEvents(events)) {
    const track = event.track === 'accompaniment' ? 'accompaniment' : 'melody';
    delete event.track;
    (track === 'melody' ? melodyEvents : accompanimentEvents).push(event);
    trackOrder.push(track);
  }
  return { melodyEvents, accompanimentEvents, trackOrder };
}

export function projectSongWordEvents(word: SongWord): MusicEvent[] {
  const queues: Record<MusicTrackId, MusicEvent[]> = {
    melody: cloneCanonicalEvents(word.melodyEvents),
    accompaniment: cloneCanonicalEvents(word.accompanimentEvents),
  };
  const expectedLength = queues.melody.length + queues.accompaniment.length;
  const configuredOrder = word.legacyNotation.trackOrder;
  const order: readonly MusicTrackId[] =
    configuredOrder?.length === expectedLength &&
    configuredOrder.filter((track) => track === 'melody').length === queues.melody.length &&
    configuredOrder.filter((track) => track === 'accompaniment').length ===
      queues.accompaniment.length
      ? configuredOrder
      : [
          ...Array<MusicTrackId>(queues.melody.length).fill('melody'),
          ...Array<MusicTrackId>(queues.accompaniment.length).fill('accompaniment'),
        ];
  return order.map((track) => ({ ...queues[track].shift()!, track }));
}

export function songWordEventsForTrack(word: SongWord, track: MusicTrackId): readonly MusicEvent[] {
  return track === 'melody' ? word.melodyEvents : word.accompanimentEvents;
}

export function createTrackedWordFields(
  raw: string,
  durations?: readonly (number | null)[],
  tracks?: readonly (MusicTrackId | null)[],
): Pick<SongWord, 'melodyEvents' | 'accompanimentEvents' | 'legacyNotation'> {
  const replacement = replaceWithLegacyNotation(raw, durations);
  const trackedEvents = replacement.events.map((event, index) => ({
    ...event,
    track: tracks?.[index] === 'accompaniment' ? 'accompaniment' : 'melody',
  })) as MusicEvent[];
  const split = splitEventsIntoTracks(trackedEvents);
  return {
    melodyEvents: split.melodyEvents,
    accompanimentEvents: split.accompanimentEvents,
    legacyNotation: {
      ...fidelityForEvents(raw, trackedEvents),
      trackOrder: split.trackOrder,
      ...(tracks === undefined ? {} : { trackMetadataExplicit: true }),
    },
  };
}

export function migrateSongDocumentTracks(input: SongDocument | unknown): SongDocument {
  const mutable = structuredClone(input) as SongDocument & {
    song: { lines: { words: Array<Partial<SongWord> & { events?: MusicEvent[] }> }[] };
  };
  if (!mutable?.song || !Array.isArray(mutable.song.lines)) {
    throw new Error('Gespeicherter Song enthält keine gültigen Zeilen.');
  }
  for (const line of mutable.song.lines) {
    if (!Array.isArray(line.words)) {
      throw new Error('Gespeicherter Song enthält keine gültigen Blöcke.');
    }
    for (const word of line.words) {
      if (!word.legacyNotation || typeof word.legacyNotation.raw !== 'string') {
        throw new Error('Gespeicherter Block enthält keine gültige Legacy-Notation.');
      }
      if (
        !Array.isArray(word.events) &&
        (!Array.isArray(word.melodyEvents) || !Array.isArray(word.accompanimentEvents))
      ) {
        throw new Error('Gespeicherter Block enthält keine gültigen Musikspuren.');
      }
      const sourceEvents = Array.isArray(word.events)
        ? word.events
        : projectSongWordEvents(word as SongWord);
      const split = splitEventsIntoTracks(sourceEvents);
      word.melodyEvents = split.melodyEvents;
      word.accompanimentEvents = split.accompanimentEvents;
      word.legacyNotation = {
        ...cloneLegacyNotationFidelity(word.legacyNotation),
        eventFingerprint: fidelityForEvents(word.legacyNotation.raw, sourceEvents).eventFingerprint,
        trackOrder: Array.isArray(word.events)
          ? split.trackOrder
          : (word.legacyNotation.trackOrder ?? split.trackOrder),
        ...(word.legacyNotation.trackMetadataExplicit ||
        (Array.isArray(word.events) && word.events.some((event) => event.track !== undefined))
          ? { trackMetadataExplicit: true }
          : {}),
      };
      delete word.events;
    }
  }
  return cloneDocument(mutable);
}

function cloneCanonicalEvents(events: readonly MusicEvent[]): MusicEvent[] {
  return cloneMusicEvents(events).map((event) => {
    delete event.track;
    return event;
  });
}
