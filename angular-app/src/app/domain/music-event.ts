export type NoteDuration = number | 'quarter';
export type MusicTrackId = 'melody' | 'accompaniment';

export interface Pitch {
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  octave: 0 | 1 | 2;
}

export interface NoteEvent {
  kind: 'note';
  pitch: Pitch;
  duration?: NoteDuration;
  track?: MusicTrackId;
}

export interface ChordEvent {
  kind: 'chord';
  pitches: Pitch[];
  duration?: NoteDuration;
  playback?: ChordPlayback;
  track?: MusicTrackId;
}

export interface ChordPlayback {
  style: 'together' | 'arpeggio-up' | 'arpeggio-down';
  stepBeats?: number;
}

export interface GlissandoEvent {
  kind: 'glissando';
  startPitch: Pitch;
  endPitch: Pitch;
  direction: 'ascending' | 'descending';
  pitches: Pitch[];
  duration?: NoteDuration;
  stepBeats?: number;
  track?: MusicTrackId;
}

export interface SeparatorEvent {
  kind: 'separator';
  track?: MusicTrackId;
}

export interface RestEvent {
  kind: 'rest';
  duration: NoteDuration;
  track?: MusicTrackId;
}

export function musicEventTrack(event: MusicEvent): MusicTrackId {
  return event.track ?? (event.kind === 'chord' ? 'accompaniment' : 'melody');
}

export function hasParallelTineCollision(events: readonly MusicEvent[]): boolean {
  return parallelTineCollisionKeys(events).size > 0;
}

export function parallelTineCollisionKeys(events: readonly MusicEvent[]): ReadonlySet<string> {
  if (!events.some((event) => event.track !== undefined)) return new Set();
  const offsets: Record<MusicTrackId, number> = { melody: 0, accompaniment: 0 };
  const attacks = new Map<string, MusicTrackId>();
  const collisions = new Set<string>();
  for (const event of events) {
    const track = musicEventTrack(event);
    if (event.kind === 'separator') continue;
    if (event.kind === 'rest') {
      offsets[track] += eventDurationInBeats(event);
      continue;
    }
    const pitches = event.kind === 'note' ? [event.pitch] : event.pitches;
    for (const pitch of pitches) {
      const key = `${offsets[track]}:${pitch.degree}:${pitch.octave}`;
      const previousTrack = attacks.get(key);
      if (previousTrack && previousTrack !== track) collisions.add(key);
      attacks.set(key, track);
    }
    offsets[track] += eventDurationInBeats(event);
  }
  return collisions;
}

export type MusicEvent = NoteEvent | ChordEvent | GlissandoEvent | RestEvent | SeparatorEvent;

export function cloneMusicEvents(events: readonly MusicEvent[]): MusicEvent[] {
  return events.map((event) => {
    switch (event.kind) {
      case 'note':
        return { ...event, pitch: { ...event.pitch }, duration: eventDurationInBeats(event) };
      case 'chord':
        return {
          ...event,
          pitches: event.pitches.map((pitch) => ({ ...pitch })),
          ...(event.playback ? { playback: { ...event.playback } } : {}),
          duration: eventDurationInBeats(event),
        };
      case 'glissando':
        return {
          ...event,
          startPitch: { ...event.startPitch },
          endPitch: { ...event.endPitch },
          pitches: event.pitches.map((pitch) => ({ ...pitch })),
          duration: eventDurationInBeats(event),
        };
      case 'rest':
        return { ...event, duration: eventDurationInBeats(event) };
      case 'separator':
        return { ...event };
    }
  });
}

export function eventDurationInBeats(
  event: Pick<NoteEvent | ChordEvent | GlissandoEvent | RestEvent, 'duration'>,
): number {
  return normalizeDurationInBeats(event.duration);
}

export function normalizeDurationInBeats(duration: NoteDuration | undefined): number {
  return typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? duration : 1;
}

export function durationLabel(duration: NoteDuration | undefined): string {
  const beats = normalizeDurationInBeats(duration);
  return `${beats} ${beats === 1 ? 'Schlag' : 'Schläge'}`;
}
