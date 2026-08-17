export type NoteDuration = number | 'quarter';

export interface Pitch {
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  octave: 0 | 1 | 2;
}

export interface NoteEvent {
  kind: 'note';
  pitch: Pitch;
  duration?: NoteDuration;
}

export interface ChordEvent {
  kind: 'chord';
  pitches: Pitch[];
  duration?: NoteDuration;
}

export interface SeparatorEvent {
  kind: 'separator';
}

export type MusicEvent = NoteEvent | ChordEvent | SeparatorEvent;

export function cloneMusicEvents(events: readonly MusicEvent[]): MusicEvent[] {
  return events.map((event) => {
    switch (event.kind) {
      case 'note':
        return { ...event, pitch: { ...event.pitch }, duration: eventDurationInBeats(event) };
      case 'chord':
        return {
          ...event,
          pitches: event.pitches.map((pitch) => ({ ...pitch })),
          duration: eventDurationInBeats(event),
        };
      case 'separator':
        return { kind: 'separator' };
    }
  });
}

export function eventDurationInBeats(
  event: Pick<NoteEvent | ChordEvent, 'duration'>,
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
