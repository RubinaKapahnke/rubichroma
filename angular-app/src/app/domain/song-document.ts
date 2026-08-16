import { cloneJson, JsonObject } from './json-value';

export interface SongWord {
  text: string;
  notation: string;
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
          notation: word.notation,
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
