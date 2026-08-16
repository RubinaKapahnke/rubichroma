export type NoteDuration = 'quarter';

export interface Pitch {
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  octave: 0 | 1 | 2;
}

export interface NoteEvent {
  kind: 'note';
  pitch: Pitch;
  duration: NoteDuration;
}

export interface ChordEvent {
  kind: 'chord';
  pitches: Pitch[];
  duration: NoteDuration;
}

export interface SeparatorEvent {
  kind: 'separator';
}

export type MusicEvent = NoteEvent | ChordEvent | SeparatorEvent;

export function cloneMusicEvents(events: readonly MusicEvent[]): MusicEvent[] {
  return events.map((event) => {
    switch (event.kind) {
      case 'note':
        return { ...event, pitch: { ...event.pitch } };
      case 'chord':
        return { ...event, pitches: event.pitches.map((pitch) => ({ ...pitch })) };
      case 'separator':
        return { kind: 'separator' };
    }
  });
}
