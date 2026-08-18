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

function restForSlots(slotCount: number): MusicEvent | null {
  return slotCount <= 0 ? null : { kind: 'rest', duration: slotCount / MUSIC_GRID_SLOTS_PER_BEAT };
}

function cloneWithDuration(event: MusicEvent, slotCount: number): MusicEvent {
  if (event.kind === 'separator') return { ...event };
  const cloned = cloneMusicEvents([event])[0];
  if (cloned.kind === 'separator') return cloned;
  cloned.duration = slotCount / MUSIC_GRID_SLOTS_PER_BEAT;
  return cloned;
}

function compactRests(events: readonly MusicEvent[]): MusicEvent[] {
  const compacted: MusicEvent[] = [];
  for (const event of cloneMusicEvents(events)) {
    const previous = compacted.at(-1);
    if (event.kind === 'rest' && previous?.kind === 'rest') {
      previous.duration = eventDurationInBeats(previous) + eventDurationInBeats(event);
    } else {
      compacted.push(event);
    }
  }
  return compacted;
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
  const safeSlot = Math.max(0, Math.floor(slot));
  const next = cloneMusicEvents(events);
  const occupied = eventAtMusicGridSlot(next, safeSlot);
  const replacementSlots = Math.max(
    1,
    Math.round(
      (replacement.kind === 'separator' ? 0.25 : eventDurationInBeats(replacement)) *
        MUSIC_GRID_SLOTS_PER_BEAT,
    ),
  );
  if (!occupied) {
    const gap = restForSlots(safeSlot - musicGridLength(next));
    if (gap) next.push(gap);
    next.push(cloneMusicEvents([replacement])[0]);
    return compactRests(next);
  }

  if (occupied.event.kind !== 'rest') {
    next[occupied.eventIndex] = cloneMusicEvents([replacement])[0];
    return compactRests(next);
  }

  const beforeSlots = safeSlot - occupied.startSlot;
  const afterSlots = Math.max(0, occupied.slotCount - beforeSlots - replacementSlots);
  const inserted: MusicEvent[] = [];
  if (beforeSlots > 0) {
    inserted.push(restForSlots(beforeSlots)!);
  }
  inserted.push(cloneMusicEvents([replacement])[0]);
  if (afterSlots > 0) {
    inserted.push(restForSlots(afterSlots)!);
  }
  next.splice(occupied.eventIndex, 1, ...inserted);
  return compactRests(next);
}

export function deleteMusicEventsInSlotRange(
  events: readonly MusicEvent[],
  fromSlot: number,
  toSlot: number,
): MusicEvent[] {
  const first = Math.min(fromSlot, toSlot);
  const last = Math.max(fromSlot, toSlot);
  const next: MusicEvent[] = [];
  let startSlot = 0;
  for (const event of events) {
    if (event.kind === 'separator') {
      next.push({ ...event });
      continue;
    }
    const slotCount = Math.max(
      1,
      Math.round(eventDurationInBeats(event) * MUSIC_GRID_SLOTS_PER_BEAT),
    );
    const entryLast = startSlot + slotCount - 1;
    if (entryLast < first || startSlot > last || event.kind === 'rest') {
      next.push(cloneMusicEvents([event])[0]);
      startSlot += slotCount;
      continue;
    }
    const before = Math.max(0, first - startSlot);
    const removed = Math.min(entryLast, last) - Math.max(startSlot, first) + 1;
    const after = Math.max(0, slotCount - before - removed);
    if (before > 0) next.push(cloneWithDuration(event, before));
    const rest = restForSlots(removed);
    if (rest) next.push(rest);
    if (after > 0) next.push(cloneWithDuration(event, after));
    startSlot += slotCount;
  }
  return compactRests(next);
}
