import { isJsonObject, JsonObject, JsonValue } from '../../domain/json-value';
import {
  encodeLegacyNotation,
  fidelityForEvents,
  fingerprintEvents,
  replaceWithLegacyNotation,
} from '../../domain/legacy-notation-codec';
import { eventDurationInBeats, MusicEvent, MusicTrackId } from '../../domain/music-event';
import {
  createTrackedWordFields,
  projectSongWordEvents,
  SongDocument,
  SongLine,
  SongWord,
} from '../../domain/song-document';

export const LEGACY_STORAGE_KEY = 'kalimba-note-tool-v1';

export class LegacyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LegacyValidationError';
  }
}

export function parseLegacyV0(input: string | unknown): SongDocument {
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      throw new LegacyValidationError('Die Datei enthält kein gültiges JSON.');
    }
  }

  const root = requireObject(value, '$');
  const songValue = requireObject(root['song'], '$.song');
  const title = requireString(songValue['title'], '$.song.title');
  const linesValue = requireArray(songValue['lines'], '$.song.lines');
  const keysValue = requireArray(root['keys'], '$.keys');
  if (keysValue.length !== 17) {
    throw new LegacyValidationError('$.keys muss genau 17 Einträge enthalten.');
  }

  const lines: SongLine[] = linesValue.map((lineValue, lineIndex) => {
    const line = requireObject(lineValue, `$.song.lines[${lineIndex}]`);
    const wordsValue = requireArray(line['words'], `$.song.lines[${lineIndex}].words`);
    const words: SongWord[] = wordsValue.map((wordValue, wordIndex) => {
      const path = `$.song.lines[${lineIndex}].words[${wordIndex}]`;
      const word = requireObject(wordValue, path);
      const toneCountValue = word['toneCount'];
      if (
        toneCountValue !== undefined &&
        (typeof toneCountValue !== 'number' || !Number.isFinite(toneCountValue))
      ) {
        throw new LegacyValidationError(`${path}.toneCount muss eine endliche Zahl sein.`);
      }
      const eventDurations = parseEventDurations(word['eventDurations'], `${path}.eventDurations`);
      const eventTracks = parseEventTracks(word['eventTracks'], `${path}.eventTracks`);
      const hasCanonicalTracks =
        word['melodyEvents'] !== undefined || word['accompanimentEvents'] !== undefined;
      const notation =
        word['notation'] === undefined && hasCanonicalTracks
          ? null
          : requireString(word['notation'], `${path}.notation`);
      if (hasCanonicalTracks) {
        const melodyEvents = parseCanonicalEvents(word['melodyEvents'], `${path}.melodyEvents`);
        const accompanimentEvents = parseCanonicalEvents(
          word['accompanimentEvents'],
          `${path}.accompanimentEvents`,
        );
        const trackOrder = parseCanonicalTrackOrder(
          word['eventTrackOrder'],
          `${path}.eventTrackOrder`,
          melodyEvents.length,
          accompanimentEvents.length,
        );
        const queues: Record<MusicTrackId, MusicEvent[]> = {
          melody: [...melodyEvents],
          accompaniment: [...accompanimentEvents],
        };
        const trackedEvents = trackOrder.map((track) => ({
          ...queues[track].shift()!,
          track,
        }));
        validateCompatibilityMetadata(eventDurations, eventTracks, trackedEvents, path);
        const canonicalNotation = notation ?? encodeLegacyNotation(trackedEvents);
        if (notation !== null) {
          const notationEvents = replaceWithLegacyNotation(notation, eventDurations).events.map(
            (event, index) => ({ ...event, track: trackOrder[index] }),
          );
          if (fingerprintEvents(notationEvents) !== fingerprintEvents(trackedEvents)) {
            throw new LegacyValidationError(`${path}.notation widerspricht den Musikspuren.`);
          }
        }
        return {
          text: requireString(word['text'], `${path}.text`),
          melodyEvents,
          accompanimentEvents,
          legacyNotation: {
            ...fidelityForEvents(canonicalNotation, trackedEvents),
            trackOrder,
            ...(eventTracks === undefined ? {} : { trackMetadataExplicit: true }),
          },
          ...(toneCountValue === undefined ? {} : { toneCount: toneCountValue }),
          extra: omit(word, [
            'text',
            'notation',
            'toneCount',
            'eventDurations',
            'eventTracks',
            'melodyEvents',
            'accompanimentEvents',
            'eventTrackOrder',
          ]),
        };
      }
      if (notation === null) throw new LegacyValidationError(`${path}.notation muss Text sein.`);
      const replacement = replaceWithLegacyNotation(notation, eventDurations);
      if (eventDurations && eventDurations.length !== replacement.events.length) {
        throw new LegacyValidationError(
          `${path}.eventDurations muss genau einen Eintrag pro Musikereignis enthalten.`,
        );
      }
      if (eventTracks && eventTracks.length !== replacement.events.length) {
        throw new LegacyValidationError(
          `${path}.eventTracks muss genau einen Eintrag pro Musikereignis enthalten.`,
        );
      }
      return {
        text: requireString(word['text'], `${path}.text`),
        ...createTrackedWordFields(notation, eventDurations, eventTracks),
        ...(toneCountValue === undefined ? {} : { toneCount: toneCountValue }),
        extra: omit(word, ['text', 'notation', 'toneCount', 'eventDurations', 'eventTracks']),
      };
    });
    return { words, extra: omit(line, ['words']) };
  });

  const keys = keysValue.map((key, index) => requireObject(key, `$.keys[${index}]`));
  return {
    song: { title, lines, extra: omit(songValue, ['title', 'lines']) },
    keys,
    extra: omit(root, ['song', 'keys', 'formatVersion']),
  };
}

export function exportVanillaCompatible(document: SongDocument): JsonObject {
  const song: JsonObject = {
    ...document.song.extra,
    title: document.song.title,
    lines: document.song.lines.map((line) => ({
      ...line.extra,
      words: line.words.map((word) => {
        const events = projectSongWordEvents(word);
        const eventDurations = events.map((event) =>
          event.kind === 'separator' ? null : eventDurationInBeats(event),
        );
        const eventTracks = events.map((event) =>
          event.kind === 'separator' ? null : (event.track ?? null),
        );
        return {
          ...word.extra,
          text: word.text,
          notation: encodeLegacyNotation(events, word.legacyNotation),
          melodyEvents: structuredClone(word.melodyEvents) as unknown as JsonValue,
          accompanimentEvents: structuredClone(word.accompanimentEvents) as unknown as JsonValue,
          eventTrackOrder: events.map((event) => event.track ?? 'melody'),
          ...(eventDurations.some((duration) => duration !== null && duration !== 1)
            ? { eventDurations }
            : {}),
          ...(word.legacyNotation.trackMetadataExplicit || word.accompanimentEvents.length > 0
            ? { eventTracks }
            : {}),
          ...(word.toneCount === undefined ? {} : { toneCount: word.toneCount }),
        };
      }),
    })),
  };

  return {
    ...document.extra,
    song,
    keys: document.keys.map((key) => structuredClone(key)),
    formatVersion: 2,
  };
}

export function stringifyVanillaCompatible(document: SongDocument): string {
  return JSON.stringify(exportVanillaCompatible(document), null, 2);
}

function requireObject(value: unknown, path: string): JsonObject {
  if (!isJsonObject(value)) throw new LegacyValidationError(`${path} muss ein Objekt sein.`);
  assertJson(value, path);
  return structuredClone(value);
}

function requireArray(value: unknown, path: string): JsonValue[] {
  if (!Array.isArray(value)) throw new LegacyValidationError(`${path} muss ein Array sein.`);
  assertJson(value, path);
  return structuredClone(value) as JsonValue[];
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new LegacyValidationError(`${path} muss Text sein.`);
  return value;
}

function parseEventDurations(value: unknown, path: string): (number | null)[] | undefined {
  if (value === undefined) return undefined;
  const durations = requireArray(value, path);
  return durations.map((duration, index) => {
    if (duration === null) return null;
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
      throw new LegacyValidationError(`${path}[${index}] muss eine positive Zahl oder null sein.`);
    }
    return duration;
  });
}

function parseEventTracks(value: unknown, path: string): (MusicTrackId | null)[] | undefined {
  if (value === undefined) return undefined;
  return requireArray(value, path).map((track, index) => {
    if (track === null || track === 'melody' || track === 'accompaniment') return track;
    throw new LegacyValidationError(`${path}[${index}] muss melody, accompaniment oder null sein.`);
  });
}

function parseCanonicalEvents(value: unknown, path: string): MusicEvent[] {
  const events = requireArray(value, path);
  return events.map((entry, index) => {
    const eventPath = `${path}[${index}]`;
    const event = requireObject(entry, eventPath);
    if ('track' in event) {
      throw new LegacyValidationError(`${eventPath}.track gehÃ¶rt nicht in eine feste Musikspur.`);
    }
    if (event['kind'] === 'separator') return event as unknown as MusicEvent;
    validateDuration(event['duration'], `${eventPath}.duration`);
    if (event['kind'] === 'note') {
      validatePitch(event['pitch'], `${eventPath}.pitch`);
      return event as unknown as MusicEvent;
    }
    if (event['kind'] === 'chord') {
      const pitches = requireArray(event['pitches'], `${eventPath}.pitches`);
      if (pitches.length === 0) {
        throw new LegacyValidationError(`${eventPath}.pitches darf nicht leer sein.`);
      }
      pitches.forEach((pitch, pitchIndex) =>
        validatePitch(pitch, `${eventPath}.pitches[${pitchIndex}]`),
      );
      return event as unknown as MusicEvent;
    }
    throw new LegacyValidationError(`${eventPath}.kind ist kein unterstÃ¼tztes Musikereignis.`);
  });
}

function parseCanonicalTrackOrder(
  value: unknown,
  path: string,
  melodyCount: number,
  accompanimentCount: number,
): MusicTrackId[] {
  const order =
    value === undefined
      ? [
          ...Array<MusicTrackId>(melodyCount).fill('melody'),
          ...Array<MusicTrackId>(accompanimentCount).fill('accompaniment'),
        ]
      : requireArray(value, path).map((track, index) => {
          if (track === 'melody' || track === 'accompaniment') return track;
          throw new LegacyValidationError(`${path}[${index}] muss eine Musikspur benennen.`);
        });
  if (
    order.filter((track) => track === 'melody').length !== melodyCount ||
    order.filter((track) => track === 'accompaniment').length !== accompanimentCount
  ) {
    throw new LegacyValidationError(`${path} passt nicht zu den beiden Musikspuren.`);
  }
  return order;
}

function validateCompatibilityMetadata(
  durations: readonly (number | null)[] | undefined,
  tracks: readonly (MusicTrackId | null)[] | undefined,
  events: readonly MusicEvent[],
  path: string,
): void {
  if (
    durations &&
    (durations.length !== events.length ||
      durations.some(
        (duration, index) =>
          duration !==
          (events[index].kind === 'separator' ? null : eventDurationInBeats(events[index])),
      ))
  ) {
    throw new LegacyValidationError(`${path}.eventDurations widerspricht den Musikspuren.`);
  }
  if (
    tracks &&
    (tracks.length !== events.length ||
      tracks.some(
        (track, index) =>
          track !== (events[index].kind === 'separator' ? null : (events[index].track ?? null)),
      ))
  ) {
    throw new LegacyValidationError(`${path}.eventTracks widerspricht den Musikspuren.`);
  }
}

function validateDuration(value: unknown, path: string): void {
  if (value === undefined || value === 'quarter') return;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new LegacyValidationError(`${path} muss eine positive Zahl sein.`);
  }
}

function validatePitch(value: unknown, path: string): void {
  const pitch = requireObject(value, path);
  if (
    typeof pitch['degree'] !== 'number' ||
    !Number.isInteger(pitch['degree']) ||
    pitch['degree'] < 1 ||
    pitch['degree'] > 7
  ) {
    throw new LegacyValidationError(`${path}.degree muss zwischen 1 und 7 liegen.`);
  }
  if (
    typeof pitch['octave'] !== 'number' ||
    !Number.isInteger(pitch['octave']) ||
    pitch['octave'] < 0 ||
    pitch['octave'] > 2
  ) {
    throw new LegacyValidationError(`${path}.octave muss zwischen 0 und 2 liegen.`);
  }
}

function assertJson(value: unknown, path: string): asserts value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertJson(entry, `${path}[${index}]`));
    return;
  }
  if (typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) assertJson(entry, `${path}.${key}`);
    return;
  }
  throw new LegacyValidationError(`${path} enthält einen nicht unterstützten JSON-Wert.`);
}

function omit(source: JsonObject, knownKeys: readonly string[]): JsonObject {
  return Object.fromEntries(Object.entries(source).filter(([key]) => !knownKeys.includes(key)));
}
