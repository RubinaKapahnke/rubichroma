import { isJsonObject, JsonObject, JsonValue } from '../../domain/json-value';
import {
  encodeLegacyNotation,
  replaceWithLegacyNotation,
} from '../../domain/legacy-notation-codec';
import { SongDocument, SongLine, SongWord } from '../../domain/song-document';

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
      return {
        text: requireString(word['text'], `${path}.text`),
        ...replaceWithLegacyNotation(requireString(word['notation'], `${path}.notation`)),
        ...(toneCountValue === undefined ? {} : { toneCount: toneCountValue }),
        extra: omit(word, ['text', 'notation', 'toneCount']),
      };
    });
    return { words, extra: omit(line, ['words']) };
  });

  const keys = keysValue.map((key, index) => requireObject(key, `$.keys[${index}]`));
  return {
    song: { title, lines, extra: omit(songValue, ['title', 'lines']) },
    keys,
    extra: omit(root, ['song', 'keys']),
  };
}

export function exportVanillaCompatible(document: SongDocument): JsonObject {
  const song: JsonObject = {
    ...document.song.extra,
    title: document.song.title,
    lines: document.song.lines.map((line) => ({
      ...line.extra,
      words: line.words.map((word) => ({
        ...word.extra,
        text: word.text,
        notation: encodeLegacyNotation(word.events, word.legacyNotation),
        ...(word.toneCount === undefined ? {} : { toneCount: word.toneCount }),
      })),
    })),
  };

  return {
    ...document.extra,
    song,
    keys: document.keys.map((key) => structuredClone(key)),
    ...(document.extra['formatVersion'] === undefined ? { formatVersion: 1 } : {}),
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
