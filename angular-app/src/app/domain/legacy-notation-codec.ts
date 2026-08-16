import { cloneMusicEvents, MusicEvent, Pitch } from './music-event';

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
        events.push({ kind: 'chord', pitches, duration: 'quarter' });
      } else {
        hasUnknownFragments = true;
      }
      continue;
    }
    const pitch = parsePitch(token);
    if (pitch) {
      events.push({ kind: 'note', pitch, duration: 'quarter' });
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
        return ['n', event.pitch.degree, event.pitch.octave, event.duration];
      case 'chord':
        return ['c', event.pitches.map((pitch) => [pitch.degree, pitch.octave]), event.duration];
      case 'separator':
        return ['s'];
    }
  });
  return `v1:${JSON.stringify(semanticShape)}`;
}

export function replaceWithLegacyNotation(raw: string): {
  events: MusicEvent[];
  legacyNotation: LegacyNotationFidelity;
} {
  const decoded = decodeLegacyNotation(raw);
  return {
    events: cloneMusicEvents(decoded.events),
    legacyNotation: cloneLegacyNotationFidelity(decoded.fidelity),
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
