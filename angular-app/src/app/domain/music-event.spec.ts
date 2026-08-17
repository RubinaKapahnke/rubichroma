import { describe, expect, it } from 'vitest';
import { cloneMusicEvents, eventDurationInBeats, MusicEvent } from './music-event';

describe('music event duration compatibility', () => {
  it('normalizes missing and legacy quarter durations to one beat and preserves explicit beats', () => {
    const events: MusicEvent[] = [
      { kind: 'note', pitch: { degree: 1, octave: 0 } },
      { kind: 'note', pitch: { degree: 2, octave: 0 }, duration: 'quarter' },
      { kind: 'note', pitch: { degree: 3, octave: 0 }, duration: 2 },
    ];

    const cloned = cloneMusicEvents(events);
    expect(cloned.map((event) => (event.kind === 'separator' ? 0 : eventDurationInBeats(event)))).toEqual([
      1,
      1,
      2,
    ]);
    expect(cloned.map((event) => (event.kind === 'separator' ? undefined : event.duration))).toEqual([
      1,
      1,
      2,
    ]);
  });
});
