import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { DEFAULT_DOCUMENT } from '../../domain/default-document';
import { createSongLinesForm } from './song-editor-form';
import { SongSheetComponent, WordSelectionGesture } from './song-sheet.component';

describe('SongSheetComponent desktop selection gestures', () => {
  it('maps Shift and Ctrl/Command clicks without losing the clicked position', async () => {
    await TestBed.configureTestingModule({ imports: [SongSheetComponent] }).compileComponents();
    const fixture: ComponentFixture<SongSheetComponent> =
      TestBed.createComponent(SongSheetComponent);
    fixture.componentRef.setInput('lines', createSongLinesForm(DEFAULT_DOCUMENT));
    fixture.componentRef.setInput('selection', null);
    fixture.componentRef.setInput('selectedPositions', []);
    const gestures: WordSelectionGesture[] = [];
    fixture.componentInstance.wordSelect.subscribe((gesture) => gestures.push(gesture));
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.word-card') as NodeListOf<HTMLElement>;
    cards[0].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    cards[1].dispatchEvent(new MouseEvent('click', { bubbles: true, metaKey: true }));

    expect(gestures).toEqual([
      {
        position: { lineIndex: 0, wordIndex: 0 },
        shiftKey: true,
        toggleKey: false,
      },
      {
        position: { lineIndex: 0, wordIndex: 1 },
        shiftKey: false,
        toggleKey: true,
      },
    ]);
  });
});
