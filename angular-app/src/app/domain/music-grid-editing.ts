import { cloneMusicEvents, eventDurationInBeats, MusicEvent } from './music-event';

export const MUSIC_GRID_SLOTS_PER_BEAT = 4;
export const MUSIC_GRID_SLOTS_PER_BAR = 16;

export interface MusicGridEvent {
  readonly event: MusicEvent;
  readonly eventIndex: number;
  readonly startSlot: number;
  readonly slotCount: number;
}

export function projectMusicEventsToGrid(events: readonly MusicEvent[]): MusicGridEvent[] {
  let startSlot = 0;
  return events.flatMap((event, eventIndex) => {
    if (event.kind === 'separator') return [];
    const slotCount = Math.max(
      1,
      Math.round(eventDurationInBeats(event) * MUSIC_GRID_SLOTS_PER_BEAT),
    );
    const projected = { event, eventIndex, startSlot, slotCount };
    startSlot += slotCount;
    return [projected];
  });
}

export function musicGridLength(events: readonly MusicEvent[]): number {
  const projected = projectMusicEventsToGrid(events);
  const last = projected.at(-1);
  return last ? last.startSlot + last.slotCount : 0;
}

export function eventAtMusicGridSlot(
  events: readonly MusicEvent[],
  slot: number,
): MusicGridEvent | undefined {
  return projectMusicEventsToGrid(events).find(
    (entry) => slot >= entry.startSlot && slot < entry.startSlot + entry.slotCount,
  );
}

export function replaceMusicEventAtSlot(
  events: readonly MusicEvent[],
  slot: number,
  replacement: MusicEvent,
): MusicEvent[] {
  const next = cloneMusicEvents(events);
  const occupied = eventAtMusicGridSlot(next, slot);
  if (occupied) next[occupied.eventIndex] = cloneMusicEvents([replacement])[0];
  else next.push(cloneMusicEvents([replacement])[0]);
  return next;
}

export function deleteMusicEventsInSlotRange(
  events: readonly MusicEvent[],
  fromSlot: number,
  toSlot: number,
): MusicEvent[] {
  const first = Math.min(fromSlot, toSlot);
  const last = Math.max(fromSlot, toSlot);
  const remove = new Set(
    projectMusicEventsToGrid(events)
      .filter((entry) => entry.startSlot <= last && entry.startSlot + entry.slotCount - 1 >= first)
      .map((entry) => entry.eventIndex),
  );
  return cloneMusicEvents(events).filter((_, index) => !remove.has(index));
}
