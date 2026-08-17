import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { replaceWithLegacyNotation } from '../../domain/legacy-notation-codec';
import { MusicEvent, MusicTrackId, Pitch } from '../../domain/music-event';
import { profileInkColor, WordEditorComponent } from './word-editor.component';

describe('word editor profile colors', () => {
  it('chooses text contrast without changing the stored profile color', () => {
    expect(profileInkColor('#342E38')).toBe('#ffffff');
    expect(profileInkColor('#6B1E69')).toBe('#ffffff');
    expect(profileInkColor('#F7BD30')).toBe('#171a2b');
    expect(profileInkColor('#A8DDBF')).toBe('#171a2b');
  });
});

describe('word editor syllable split', () => {
  it('previews an explicit event assignment and emits only after confirmation', () => {
    const fixture = TestBed.createComponent(WordEditorComponent);
    const parsed = replaceWithLegacyNotation('1 1 (35)');
    fixture.componentRef.setInput(
      'textControl',
      new FormControl('Twinkle,', { nonNullable: true }),
    );
    fixture.componentRef.setInput(
      'notationControl',
      new FormControl(parsed.legacyNotation.raw, { nonNullable: true }),
    );
    fixture.componentRef.setInput('structuredEvents', parsed.events);
    fixture.componentRef.setInput('location', 'Zeile 1 · Block 1');
    fixture.componentRef.setInput('testIdSuffix', '0-0');
    fixture.componentRef.setInput('keys', []);
    fixture.componentRef.setInput('isMelodyBlock', false);
    fixture.componentRef.setInput('canDeleteBlock', true);
    fixture.componentRef.setInput('canCopyToNextLine', true);
    fixture.componentRef.setInput('canUndo', false);
    fixture.componentRef.setInput('canRedo', false);
    fixture.detectChanges();

    const emitted: unknown[] = [];
    const previewedEvents: { track: MusicTrackId; eventIndex: number }[] = [];
    const previewedPitches: unknown[] = [];
    fixture.componentInstance.structureAction.subscribe((action) => emitted.push(action));
    fixture.componentInstance.musicEventPreviewRequested.subscribe((index) =>
      previewedEvents.push(index),
    );
    fixture.componentInstance.pitchPreviewRequested.subscribe((pitch) =>
      previewedPitches.push(pitch),
    );
    fixture.componentInstance.setSplitIndex('4');
    fixture.componentInstance.setFirstSplitEventCount('melody', '1');
    fixture.componentInstance.setFirstSplitEventCount('accompaniment', '0');

    expect(fixture.componentInstance.splitPreview()).toEqual({
      firstText: 'Twin-',
      secondText: 'kle,',
    });
    expect(emitted).toEqual([]);
    fixture.componentInstance.splitSyllable();
    expect(emitted).toEqual([
      {
        kind: 'split-block',
        splitIndex: 4,
        firstEventCounts: { melody: 1, accompaniment: 0 },
      },
    ]);

    fixture.componentInstance.previewEvent('melody', 1);
    fixture.componentInstance.auditionKeys.set(true);
    fixture.componentInstance.handleKey({
      id: 'c',
      value: '1',
      letter: 'C',
      hand: 'R',
      color: '#2E7975',
      pitch: { degree: 1, octave: 0 },
    });
    expect(previewedEvents).toEqual([{ track: 'melody', eventIndex: 1 }]);
    expect(previewedPitches).toEqual([{ degree: 1, octave: 0 }]);
  });
});

describe('word editor keyboard music grid', () => {
  it('keeps the existing track rows primary and the shortcut reference closed', () => {
    const fixture = createGridFixture([]);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('.music-grid-cells')).toBeNull();
    expect(host.querySelector('.keyboard-shortcuts-help')?.hasAttribute('open')).toBe(false);
    expect(
      host.querySelector('[data-testid="track-row-melody"] .keyboard-track-status')?.textContent,
    ).toContain('Aktive Spur: Melodie');
    expect(host.querySelector('.keyboard-chord-status')).toBeNull();

    fixture.componentInstance.setActiveTrack('accompaniment');
    fixture.componentInstance.handleMusicGridKeydown(keyboardEvent('KeyH', 'h', { altKey: true }));
    fixture.detectChanges();
    expect(host.querySelector('.keyboard-chord-status')?.textContent).toContain('Enter bestätigen');
  });

  it.each([
    ['KeyZ', 'y', 4],
    ['KeyX', 'x', 2],
    ['KeyC', 'c', 1],
    ['KeyV', 'v', 0.5],
    ['KeyB', 'b', 0.25],
  ])('maps the visible German Notenwert-Kürzel %s by physical code', (code, key, duration) => {
    const fixture = createGridFixture([
      { kind: 'note', pitch: { degree: 1, octave: 0 }, duration: 1, track: 'melody' },
    ]);
    const edits: Partial<Record<MusicTrackId, readonly MusicEvent[]>>[] = [];
    fixture.componentInstance.musicGridEditRequested.subscribe((edit) => edits.push(edit));

    fixture.componentInstance.handleMusicGridKeydown(keyboardEvent(code, key));

    expect(edits[0].melody?.[0]).toMatchObject({ duration });
  });

  it('uses physical codes only in the focused grid and emits a replacement with cursor progress', () => {
    const fixture = createGridFixture([
      { kind: 'note', pitch: { degree: 1, octave: 0 }, duration: 1, track: 'melody' },
    ]);
    const edits: Partial<Record<MusicTrackId, readonly MusicEvent[]>>[] = [];
    fixture.componentInstance.musicGridEditRequested.subscribe((edit) => edits.push(edit));

    fixture.componentInstance.handleMusicGridKeydown(keyboardEvent('KeyQ', 'q'));

    expect(edits).toHaveLength(1);
    expect(edits[0].melody?.[0]).toMatchObject({
      kind: 'note',
      pitch: { degree: 2, octave: 2 },
      duration: 1,
    });
    expect(fixture.componentInstance.gridCursorSlot()).toBe(4);
  });

  it('keeps the accompaniment chord draft mutation-free until Enter and cancels on Escape', () => {
    const fixture = createGridFixture([]);
    const edits: Partial<Record<MusicTrackId, readonly MusicEvent[]>>[] = [];
    fixture.componentInstance.musicGridEditRequested.subscribe((edit) => edits.push(edit));
    fixture.componentInstance.setActiveTrack('accompaniment');

    fixture.componentInstance.handleMusicGridKeydown(keyboardEvent('KeyH', 'h', { altKey: true }));
    fixture.componentInstance.handleMusicGridKeydown(keyboardEvent('KeyG', 'g'));
    expect(edits).toEqual([]);
    fixture.componentInstance.handleMusicGridKeydown(keyboardEvent('Enter', 'Enter'));
    expect(edits[0].accompaniment?.[0]).toMatchObject({
      kind: 'chord',
      pitches: [
        { degree: 1, octave: 0 },
        { degree: 2, octave: 0 },
      ],
    });

    fixture.componentInstance.handleMusicGridKeydown(keyboardEvent('KeyH', 'h', { altKey: true }));
    fixture.componentInstance.handleMusicGridKeydown(keyboardEvent('Escape', 'Escape'));
    expect(edits).toHaveLength(1);
    expect(fixture.componentInstance.keyboardChordDraft()).toBe(false);
  });

  it('changes duration and deletes a cross-track selection as one document edit', () => {
    const fixture = createGridFixture([
      { kind: 'note', pitch: { degree: 1, octave: 0 }, duration: 1, track: 'melody' },
      { kind: 'note', pitch: { degree: 7, octave: 0 }, duration: 1, track: 'accompaniment' },
    ]);
    const edits: Partial<Record<MusicTrackId, readonly MusicEvent[]>>[] = [];
    fixture.componentInstance.musicGridEditRequested.subscribe((edit) => edits.push(edit));

    fixture.componentInstance.handleMusicGridKeydown(keyboardEvent('KeyB', 'b'));
    expect(edits[0].melody?.[0]).toMatchObject({ duration: 0.25 });

    fixture.componentInstance.gridSelection.set({
      anchorTrack: 'melody',
      anchorSlot: 0,
      focusTrack: 'accompaniment',
      focusSlot: 0,
    });
    fixture.componentInstance.handleMusicGridKeydown(keyboardEvent('Delete', 'Delete'));
    expect(edits[1]).toEqual({ melody: [], accompaniment: [] });
  });
});

function createGridFixture(events: MusicEvent[]) {
  const fixture = TestBed.createComponent(WordEditorComponent);
  fixture.componentRef.setInput('textControl', new FormControl('', { nonNullable: true }));
  fixture.componentRef.setInput('notationControl', new FormControl('', { nonNullable: true }));
  fixture.componentRef.setInput('structuredEvents', events);
  fixture.componentRef.setInput('location', 'Zeile 1 · Block 1');
  fixture.componentRef.setInput('testIdSuffix', '0-0');
  fixture.componentRef.setInput(
    'keys',
    Array.from({ length: 17 }, (_, index) => {
      const pitch: Pitch = {
        degree: ((index % 7) + 1) as Pitch['degree'],
        octave: Math.floor(index / 7) as Pitch['octave'],
      };
      return {
        id: `${index}`,
        value: `${pitch.degree}`,
        letter: 'CDEFGAB'[pitch.degree - 1],
        hand: index < 8 ? ('L' as const) : ('R' as const),
        color: '#2E7975',
        pitch,
      };
    }),
  );
  fixture.componentRef.setInput('isMelodyBlock', false);
  fixture.componentRef.setInput('canDeleteBlock', true);
  fixture.componentRef.setInput('canCopyToNextLine', true);
  fixture.componentRef.setInput('canUndo', false);
  fixture.componentRef.setInput('canRedo', false);
  fixture.detectChanges();
  return fixture;
}

function keyboardEvent(code: string, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { code, key, cancelable: true, ...init });
}
