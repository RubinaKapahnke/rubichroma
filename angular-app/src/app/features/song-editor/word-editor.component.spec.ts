import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { replaceWithLegacyNotation } from '../../domain/legacy-notation-codec';
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
    const previewedEvents: number[] = [];
    const previewedPitches: unknown[] = [];
    fixture.componentInstance.structureAction.subscribe((action) => emitted.push(action));
    fixture.componentInstance.musicEventPreviewRequested.subscribe((index) =>
      previewedEvents.push(index),
    );
    fixture.componentInstance.pitchPreviewRequested.subscribe((pitch) =>
      previewedPitches.push(pitch),
    );
    fixture.componentInstance.setSplitIndex('4');
    fixture.componentInstance.setFirstSplitEventCount('1');

    expect(fixture.componentInstance.splitPreview()).toEqual({
      firstText: 'Twin-',
      secondText: 'kle,',
    });
    expect(emitted).toEqual([]);
    fixture.componentInstance.splitSyllable();
    expect(emitted).toEqual([{ kind: 'split-block', splitIndex: 4, firstEventCount: 1 }]);

    fixture.componentInstance.previewEvent(1);
    fixture.componentInstance.auditionKeys.set(true);
    fixture.componentInstance.handleKey({
      id: 'c',
      value: '1',
      letter: 'C',
      hand: 'R',
      color: '#2E7975',
      pitch: { degree: 1, octave: 0 },
    });
    expect(previewedEvents).toEqual([1]);
    expect(previewedPitches).toEqual([{ degree: 1, octave: 0 }]);
  });
});
