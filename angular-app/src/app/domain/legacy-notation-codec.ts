import {
  cloneMusicEvents,
  eventDurationInBeats,
  MusicEvent,
  normalizeDurationInBeats,
  Pitch,
} from './music-event';

export const LEGACY_NOTATION_PARSER_VERSION = 'legacy-notation-v1' as const;

export interface LegacyNotationFidelity {
  raw: string;
  parserVersion: typeof LEGACY_NOTATION_PARSER_VERSION;
  eventFingerprint: string;
}

export interface DecodedLegacyNotation {
  events: MusicEvent[];
  fidelity: LegacyNotationFidelity;
  hasUnknownFragments: boolean;
}

const outerTokenPattern = /\s+|\([^)]*\)|-|[1-7](?:″|['′’]{1,2})?|[^()\s-]+|[()]/gu;
const chordPitchPattern = /[1-7](?:″|['′’]{1,2})?/uy;

export function decodeLegacyNotation(raw: string): DecodedLegacyNotation {
  const events: MusicEvent[] = [];
  let hasUnknownFragments = false;
  const tokens = raw.match(outerTokenPattern) ?? [];

  for (const token of tokens) {
    if (/^\s+$/u.test(token)) continue;
    if (token === '-') {
      events.push({ kind: 'separator' });
      continue;
    }
    if (token.startsWith('(') && token.endsWith(')')) {
      const pitches = parseChord(token.slice(1, -1));
      if (pitches) {
        events.push({ kind: 'chord', pitches, duration: 1 });
      } else {
        hasUnknownFragments = true;
      }
      continue;
    }
    const pitch = parsePitch(token);
    if (pitch) {
      events.push({ kind: 'note', pitch, duration: 1 });
    } else {
      hasUnknownFragments = true;
    }
  }

  return {
    events,
    fidelity: {
      raw,
      parserVersion: LEGACY_NOTATION_PARSER_VERSION,
      eventFingerprint: fingerprintEvents(events),
    },
    hasUnknownFragments,
  };
}

export function encodeLegacyNotation(
  events: readonly MusicEvent[],
  fidelity?: LegacyNotationFidelity,
): string {
  if (
    fidelity?.parserVersion === LEGACY_NOTATION_PARSER_VERSION &&
    fidelity.eventFingerprint === fingerprintEvents(events)
  ) {
    return fidelity.raw;
  }
  return events.map(serializeEvent).join(' ');
}

export function cloneLegacyNotationFidelity(
  fidelity: LegacyNotationFidelity,
): LegacyNotationFidelity {
  return { ...fidelity };
}

export function fingerprintEvents(events: readonly MusicEvent[]): string {
  const semanticShape = events.map((event) => {
    switch (event.kind) {
      case 'note':
        return ['n', event.pitch.degree, event.pitch.octave, durationFingerprint(event)];
      case 'chord':
        return [
          'c',
          event.pitches.map((pitch) => [pitch.degree, pitch.octave]),
          durationFingerprint(event),
        ];
      case 'separator':
        return ['s'];
    }
  });
  return `v1:${JSON.stringify(semanticShape)}`;
}

export function replaceWithLegacyNotation(
  raw: string,
  durations?: readonly (number | null)[],
): {
  events: MusicEvent[];
  legacyNotation: LegacyNotationFidelity;
} {
  const decoded = decodeLegacyNotation(raw);
  const events = decoded.events.map((event, index): MusicEvent =>
    event.kind === 'separator'
      ? event
      : { ...event, duration: normalizeDurationInBeats(durations?.[index] ?? undefined) },
  );
  return {
    events: cloneMusicEvents(events),
    legacyNotation: fidelityForEvents(raw, events),
  };
}

export function fidelityForEvents(
  raw: string,
  events: readonly MusicEvent[],
): LegacyNotationFidelity {
  return {
    raw,
    parserVersion: LEGACY_NOTATION_PARSER_VERSION,
    eventFingerprint: fingerprintEvents(events),
  };
}

function parseChord(raw: string): Pitch[] | null {
  const pitches: Pitch[] = [];
  let index = 0;
  while (index < raw.length) {
    const whitespace = /^\s+/u.exec(raw.slice(index));
    if (whitespace) {
      index += whitespace[0].length;
      continue;
    }
    chordPitchPattern.lastIndex = index;
    const match = chordPitchPattern.exec(raw);
    if (!match) return null;
    const pitch = parsePitch(match[0]);
    if (!pitch) return null;
    pitches.push(pitch);
    index = chordPitchPattern.lastIndex;
  }
  return pitches.length > 0 ? pitches : null;
}

function parsePitch(raw: string): Pitch | null {
  const match = /^([1-7])(″|['′’]{1,2})?$/u.exec(raw);
  if (!match) return null;
  const marker = match[2] ?? '';
  const octave = marker === '″' ? 2 : marker.length;
  return {
    degree: Number(match[1]) as Pitch['degree'],
    octave: octave as Pitch['octave'],
  };
}

function serializeEvent(event: MusicEvent): string {
  switch (event.kind) {
    case 'note':
      return serializePitch(event.pitch);
    case 'chord':
      return `(${event.pitches.map(serializePitch).join('')})`;
    case 'separator':
      return '-';
  }
}

function serializePitch(pitch: Pitch): string {
  return `${pitch.degree}${pitch.octave === 0 ? '' : pitch.octave === 1 ? '′' : '″'}`;
}

function durationFingerprint(
  event: Exclude<MusicEvent, { kind: 'separator' }>,
): string | [string, number] {
  const beats = eventDurationInBeats(event);
  return beats === 1 ? 'quarter' : ['beats', beats];
}
