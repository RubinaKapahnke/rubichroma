import { decodeLegacyNotation, encodeLegacyNotation } from './legacy-notation-codec';
import { cloneMusicEvents, MusicEvent } from './music-event';

export type MusicEventEditResult =
  { ok: true; notation: string } | { ok: false; reason: 'unknown-legacy-fragments' };

export function appendMusicEvent(raw: string, event: MusicEvent): MusicEventEditResult {
  return editKnownEvents(raw, (events) => [...events, ...cloneMusicEvents([event])]);
}

export function removeMusicEvent(raw: string, eventIndex: number): MusicEventEditResult {
  return editKnownEvents(raw, (events) => events.filter((_, index) => index !== eventIndex));
}

function editKnownEvents(
  raw: string,
  edit: (events: readonly MusicEvent[]) => MusicEvent[],
): MusicEventEditResult {
  const decoded = decodeLegacyNotation(raw);
  if (decoded.hasUnknownFragments) {
    return { ok: false, reason: 'unknown-legacy-fragments' };
  }

  return { ok: true, notation: encodeLegacyNotation(edit(decoded.events)) };
}
