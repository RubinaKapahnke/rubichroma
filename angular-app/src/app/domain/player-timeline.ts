import { decodeLegacyNotation } from './legacy-notation-codec';
import { eventDurationInBeats, MusicEvent, Pitch } from './music-event';
import { songWordEventsForTrack, SongDocument } from './song-document';
import { SongPosition } from './song-structure-editing';

export type PlayerTrackId = 'melody' | 'accompaniment';

export interface PlayerKey {
  readonly id: string;
  readonly lane: number;
  readonly pitch: Pitch;
  readonly degreeLabel: string;
  readonly letter: string;
  readonly color: string;
}

export interface PlayerTimelineBar {
  readonly number: number;
  readonly startBeat: number;
  readonly endBeat: number;
}

export interface PlayerTimelineEvent {
  readonly id: string;
  readonly startBeat: number;
  readonly durationBeats: number;
  readonly lineIndex: number;
  readonly wordIndex: number;
  readonly pitches: readonly Pitch[];
  readonly lanes: readonly number[];
  readonly frequencies: readonly number[];
  readonly track: PlayerTrackId;
  readonly barNumber: number;
  /** Duration per physical lane, clipped by the next attack on that lane. */
  readonly laneDurationBeats: readonly number[];
  readonly color: string;
}

/**
 * Backwards-compatible lyric contract projected from one existing editor word.
 * Existing documents need no migration: a word remains one timed text segment.
 * A trailing hyphen declares continuation and stays inside this segment.
 */
export interface PlayerTimelineWord {
  readonly id: string;
  readonly lineIndex: number;
  readonly wordIndex: number;
  readonly text: string | null;
  readonly eventIds: readonly string[];
  readonly continuesWord: boolean;
  readonly wordEnd: boolean;
  readonly barNumber: number;
  readonly startBeat: number;
  readonly endBeat: number;
}

export interface PlayerTimelineLine {
  readonly lineIndex: number;
  readonly words: readonly PlayerTimelineWord[];
  readonly startBeat: number;
  readonly endBeat: number;
}

export interface PlayerTimeline {
  readonly events: readonly PlayerTimelineEvent[];
  readonly words: readonly PlayerTimelineWord[];
  readonly lines: readonly PlayerTimelineLine[];
  readonly keys: readonly PlayerKey[];
  readonly bars: readonly PlayerTimelineBar[];
  readonly beatsPerBar: number;
  readonly totalBeats: number;
}

export interface PlayerBeatRange {
  readonly startBeat: number;
  readonly endBeat: number;
}

const DEGREE_SEMITONES = [0, 0, 2, 4, 5, 7, 9, 11] as const;
const CONCERT_C4 = 261.625565;
const INSTRUMENTAL_TEXT = /^[\s♪♫♩♬]+$/u;
export const PLAYER_BEATS_PER_BAR = 4;
export const PLAYER_KEY_PULSE_BEATS = 0.45;

export function buildPlayerTimeline(document: SongDocument): PlayerTimeline {
  const keys = playerKeys(document);
  const keyByPitch = new Map(keys.map((key) => [pitchKey(key.pitch), key]));
  const events: PlayerTimelineEvent[] = [];
  const words: PlayerTimelineWord[] = [];
  let beat = 0;

  document.song.lines.forEach((line, lineIndex) => {
    line.words.forEach((word, wordIndex) => {
      const startBeat = beat;
      const eventIds: string[] = [];
      const trackOffsets: Record<PlayerTrackId, number> = { melody: 0, accompaniment: 0 };
      for (const track of ['melody', 'accompaniment'] as const) {
        songWordEventsForTrack(word, track).forEach((event, eventIndex) => {
          if (event.kind === 'separator') return;
          const eventStartBeat = startBeat + trackOffsets[track];
          const pitches = eventPitches(event);
          const mappedKeys = pitches.flatMap((pitch) => {
            const key = keyByPitch.get(pitchKey(pitch));
            return key ? [key] : [];
          });
          if (mappedKeys.length === 0) return;
          const durationBeats = durationInBeats(event);
          const id = `event-${lineIndex}-${wordIndex}-${track}-${eventIndex}`;
          eventIds.push(id);
          events.push({
            id,
            startBeat: eventStartBeat,
            durationBeats,
            lineIndex,
            wordIndex,
            pitches: mappedKeys.map((key) => key.pitch),
            lanes: mappedKeys.map((key) => key.lane),
            frequencies: mappedKeys.map((key) => frequencyOf(key.pitch)),
            track,
            barNumber: Math.floor(eventStartBeat / PLAYER_BEATS_PER_BAR) + 1,
            laneDurationBeats: mappedKeys.map(() => durationBeats),
            color: mappedKeys[0].color,
          });
          trackOffsets[track] += durationBeats;
        });
      }
      beat += Math.max(trackOffsets.melody, trackOffsets.accompaniment);
      const text = visibleText(word.text);
      const continuesWord = text?.endsWith('-') ?? false;
      words.push({
        id: `word-${lineIndex}-${wordIndex}`,
        lineIndex,
        wordIndex,
        text,
        eventIds,
        continuesWord,
        wordEnd: !continuesWord,
        barNumber: Math.floor(startBeat / PLAYER_BEATS_PER_BAR) + 1,
        startBeat,
        endBeat: beat,
      });
    });
  });

  const orderedEvents = [...events].sort(
    (left, right) =>
      left.startBeat - right.startBeat ||
      (left.track === right.track ? 0 : left.track === 'melody' ? -1 : 1),
  );
  const clippedEvents = orderedEvents.map((event) => ({
    ...event,
    laneDurationBeats: event.lanes.map((lane) => {
      const nextStart = orderedEvents
        .filter(
          (candidate) => candidate.startBeat > event.startBeat && candidate.lanes.includes(lane),
        )
        .sort((left, right) => left.startBeat - right.startBeat)[0]?.startBeat;
      return Math.max(0, Math.min(event.durationBeats, (nextStart ?? Infinity) - event.startBeat));
    }),
  }));

  const lines = document.song.lines.map((_, lineIndex) => {
    const lineWords = words.filter((word) => word.lineIndex === lineIndex);
    return {
      lineIndex,
      words: lineWords,
      startBeat: lineWords[0]?.startBeat ?? 0,
      endBeat: lineWords.at(-1)?.endBeat ?? 0,
    };
  });
  const bars = Array.from(
    { length: Math.max(1, Math.ceil(beat / PLAYER_BEATS_PER_BAR)) },
    (_, index) => ({
      number: index + 1,
      startBeat: index * PLAYER_BEATS_PER_BAR,
      endBeat: Math.min(beat, (index + 1) * PLAYER_BEATS_PER_BAR),
    }),
  );

  return {
    events: clippedEvents,
    words,
    lines,
    keys,
    bars,
    beatsPerBar: PLAYER_BEATS_PER_BAR,
    totalBeats: beat,
  };
}

export function contiguousPlayerRange(
  document: SongDocument,
  positions: readonly SongPosition[],
): PlayerBeatRange | null {
  if (positions.length === 0) return null;
  const ordered = document.song.lines.flatMap((line, lineIndex) =>
    line.words.map((_, wordIndex) => ({ lineIndex, wordIndex })),
  );
  const indices = positions
    .map((position) =>
      ordered.findIndex(
        (candidate) =>
          candidate.lineIndex === position.lineIndex && candidate.wordIndex === position.wordIndex,
      ),
    )
    .sort((left, right) => left - right);
  if (
    indices.some((index) => index < 0) ||
    indices.some((index, offset) => offset > 0 && index !== indices[offset - 1] + 1)
  ) {
    return null;
  }

  const timeline = buildPlayerTimeline(document);
  const selectedKeys = new Set(positions.map(positionKey));
  const selectedWords = timeline.words.filter((word) => selectedKeys.has(positionKey(word)));
  const startBeat = selectedWords[0]?.startBeat;
  const endBeat = selectedWords.at(-1)?.endBeat;
  return startBeat === undefined || endBeat === undefined || endBeat <= startBeat
    ? null
    : { startBeat, endBeat };
}

export function activeTimelineEvent(
  timeline: PlayerTimeline,
  positionBeat: number,
): PlayerTimelineEvent | null {
  return (
    timeline.events.find(
      (event) =>
        positionBeat >= event.startBeat && positionBeat < event.startBeat + event.durationBeats,
    ) ?? null
  );
}

export function activeTimelineWord(
  timeline: PlayerTimeline,
  positionBeat: number,
): PlayerTimelineWord | null {
  return (
    timeline.words.find(
      (word) =>
        word.text !== null &&
        word.endBeat > word.startBeat &&
        positionBeat >= word.startBeat &&
        positionBeat < word.endBeat,
    ) ?? null
  );
}

export function activeTimelineLaneEvent(
  timeline: PlayerTimeline,
  lane: number,
  positionBeat: number,
): PlayerTimelineEvent | null {
  return (
    timeline.events.find((event) => {
      const laneIndex = event.lanes.indexOf(lane);
      if (laneIndex < 0) return false;
      const visibleDuration = Math.min(
        event.laneDurationBeats[laneIndex] ?? event.durationBeats,
        PLAYER_KEY_PULSE_BEATS,
      );
      return positionBeat >= event.startBeat && positionBeat < event.startBeat + visibleDuration;
    }) ?? null
  );
}

export function nextTimelineEvent(
  timeline: PlayerTimeline,
  positionBeat: number,
  track: PlayerTrackId = 'melody',
): PlayerTimelineEvent | null {
  return (
    timeline.events.find((event) => event.track === track && event.startBeat > positionBeat) ?? null
  );
}

function playerKeys(document: SongDocument): PlayerKey[] {
  return document.keys.flatMap((rawKey, lane) => {
    const value = rawKey['value'];
    if (typeof value !== 'string') return [];
    const event = decodeLegacyNotation(value).events[0];
    if (!event || event.kind !== 'note') return [];
    return [
      {
        id: `key-${lane}`,
        lane,
        pitch: event.pitch,
        degreeLabel: value,
        letter: typeof rawKey['letter'] === 'string' ? rawKey['letter'] : value,
        color: typeof rawKey['color'] === 'string' ? rawKey['color'] : '#8f90a0',
      },
    ];
  });
}

function visibleText(value: string): string | null {
  const text = value.trim();
  return text.length === 0 || INSTRUMENTAL_TEXT.test(text) ? null : text;
}

function eventPitches(event: Exclude<MusicEvent, { kind: 'separator' }>): readonly Pitch[] {
  return event.kind === 'note' ? [event.pitch] : event.pitches;
}

function durationInBeats(event: Exclude<MusicEvent, { kind: 'separator' }>): number {
  return eventDurationInBeats(event);
}

export function frequencyOf(pitch: Pitch): number {
  const semitones = DEGREE_SEMITONES[pitch.degree] + pitch.octave * 12;
  return CONCERT_C4 * 2 ** (semitones / 12);
}

function pitchKey(pitch: Pitch): string {
  return `${pitch.degree}:${pitch.octave}`;
}

function positionKey(position: SongPosition): string {
  return `${position.lineIndex}:${position.wordIndex}`;
}
