import { describe, expect, it } from 'vitest';
import {
  deleteMusicEventsInSlotRange,
  eventAtMusicGridSlot,
  musicGridLength,
  projectMusicEventsToGrid,
  replaceMusicEventAtSlot,
} from './music-grid-editing';
import { MusicEvent } from './music-event';

describe('music grid projection', () => {
  const events: MusicEvent[] = [
    { kind: 'note', pitch: { degree: 1, octave: 0 }, duration: 4 },
    { kind: 'note', pitch: { degree: 2, octave: 0 }, duration: 0.5 },
    { kind: 'chord', pitches: [{ degree: 3, octave: 0 }], duration: 0.25 },
  ];

  it('projects canonical sequential durations to real sixteenth widths', () => {
    expect(
      projectMusicEventsToGrid(events).map(({ startSlot, slotCount }) => ({
        startSlot,
        slotCount,
      })),
    ).toEqual([
      { startSlot: 0, slotCount: 16 },
      { startSlot: 16, slotCount: 2 },
      { startSlot: 18, slotCount: 1 },
    ]);
    expect(musicGridLength(events)).toBe(19);
  });

  it('replaces an occupied event and preserves deleted time as a rest', () => {
    const replacement = { kind: 'note', pitch: { degree: 7, octave: 1 }, duration: 1 } as const;
    const replaced = replaceMusicEventAtSlot(events, 8, replacement);
    expect(replaced[0]).toMatchObject(replacement);
    expect(eventAtMusicGridSlot(replaced, 0)?.slotCount).toBe(4);

    const deleted = deleteMusicEventsInSlotRange(events, 15, 17);
    expect(
      projectMusicEventsToGrid(deleted).map(({ event, startSlot, slotCount }) => ({
        kind: event.kind,
        startSlot,
        slotCount,
      })),
    ).toEqual([
      { kind: 'note', startSlot: 0, slotCount: 15 },
      { kind: 'rest', startSlot: 15, slotCount: 3 },
      { kind: 'chord', startSlot: 18, slotCount: 1 },
    ]);
  });

  it('persists a gap and splits it when inserting at an exact sixteenth slot', () => {
    const withGap = replaceMusicEventAtSlot([], 5, events[2]);
    expect(
      projectMusicEventsToGrid(withGap).map(({ event, startSlot, slotCount }) => ({
        kind: event.kind,
        startSlot,
        slotCount,
      })),
    ).toEqual([
      { kind: 'rest', startSlot: 0, slotCount: 5 },
      { kind: 'chord', startSlot: 5, slotCount: 1 },
    ]);

    const inserted = replaceMusicEventAtSlot([{ kind: 'rest', duration: 4 }], 6, {
      kind: 'note',
      pitch: { degree: 4, octave: 0 },
      duration: 0.5,
    });
    expect(
      projectMusicEventsToGrid(inserted).map(({ event, startSlot, slotCount }) => ({
        kind: event.kind,
        startSlot,
        slotCount,
      })),
    ).toEqual([
      { kind: 'rest', startSlot: 0, slotCount: 6 },
      { kind: 'note', startSlot: 6, slotCount: 2 },
      { kind: 'rest', startSlot: 8, slotCount: 8 },
    ]);
  });
});
