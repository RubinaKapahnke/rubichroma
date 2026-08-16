import { describe, expect, it } from 'vitest';
import { appendMusicEvent, removeMusicEvent } from './music-event-editing';

describe('music event editing', () => {
  it('appends a structured note and chord to known notation', () => {
    const withNote = appendMusicEvent('1 -', {
      kind: 'note',
      pitch: { degree: 5, octave: 1 },
      duration: 'quarter',
    });
    expect(withNote).toEqual({ ok: true, notation: '1 - 5′' });

    if (!withNote.ok) throw new Error('Expected the note edit to succeed.');
    expect(
      appendMusicEvent(withNote.notation, {
        kind: 'chord',
        pitches: [
          { degree: 1, octave: 0 },
          { degree: 3, octave: 0 },
        ],
        duration: 'quarter',
      }),
    ).toEqual({ ok: true, notation: '1 - 5′ (13)' });
  });

  it('removes exactly the selected structured event', () => {
    expect(removeMusicEvent('1 (35) - 7′', 1)).toEqual({ ok: true, notation: '1 - 7′' });
  });

  it('refuses direct edits that would discard unknown legacy fragments', () => {
    expect(
      appendMusicEvent('1 future-token', {
        kind: 'separator',
      }),
    ).toEqual({ ok: false, reason: 'unknown-legacy-fragments' });
    expect(removeMusicEvent('1 future-token', 0)).toEqual({
      ok: false,
      reason: 'unknown-legacy-fragments',
    });
  });
});
