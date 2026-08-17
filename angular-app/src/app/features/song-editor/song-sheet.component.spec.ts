import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DOCUMENT } from '../../domain/default-document';
import { createSongLinesForm } from './song-editor-form';
import {
  SONG_STRUCTURE_HELP_HIDDEN_KEY,
  SongSheetComponent,
  WordSelectionGesture,
} from './song-sheet.component';

describe('SongSheetComponent desktop selection gestures', () => {
  it('maps Shift and Ctrl/Command clicks without losing the clicked position', async () => {
    await TestBed.configureTestingModule({ imports: [SongSheetComponent] }).compileComponents();
    const fixture: ComponentFixture<SongSheetComponent> =
      TestBed.createComponent(SongSheetComponent);
    fixture.componentRef.setInput('lines', createSongLinesForm(DEFAULT_DOCUMENT));
    fixture.componentRef.setInput('selection', null);
    fixture.componentRef.setInput('selectedPositions', []);
    fixture.componentRef.setInput('touchSelectionActive', false);
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
        touchSelection: false,
      },
      {
        position: { lineIndex: 0, wordIndex: 1 },
        shiftKey: false,
        toggleKey: true,
        touchSelection: false,
      },
    ]);
  });

  it('starts touch multi-selection on long press and toggles following taps', async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({ imports: [SongSheetComponent] }).compileComponents();
    const fixture: ComponentFixture<SongSheetComponent> =
      TestBed.createComponent(SongSheetComponent);
    fixture.componentRef.setInput('lines', createSongLinesForm(DEFAULT_DOCUMENT));
    fixture.componentRef.setInput('selection', null);
    fixture.componentRef.setInput('selectedPositions', []);
    fixture.componentRef.setInput('touchSelectionActive', false);
    const gestures: WordSelectionGesture[] = [];
    fixture.componentInstance.wordSelect.subscribe((gesture) => gestures.push(gesture));
    fixture.detectChanges();

    const touchDown = {
      pointerType: 'touch',
      isPrimary: true,
      pointerId: 7,
      clientX: 24,
      clientY: 30,
    } as PointerEvent;
    fixture.componentInstance.startLongPress(touchDown, 0, 0);
    vi.advanceTimersByTime(500);
    fixture.componentInstance.finishLongPress(touchDown);
    fixture.componentInstance.selectWord(new MouseEvent('click'), 0, 0);

    expect(gestures).toEqual([
      {
        position: { lineIndex: 0, wordIndex: 0 },
        shiftKey: false,
        toggleKey: true,
        touchSelection: true,
      },
    ]);

    fixture.componentRef.setInput('selectedPositions', [{ lineIndex: 0, wordIndex: 0 }]);
    fixture.componentRef.setInput('touchSelectionActive', true);
    fixture.detectChanges();
    fixture.componentInstance.selectWord(new MouseEvent('click'), 0, 1);

    expect(gestures.at(-1)).toEqual({
      position: { lineIndex: 0, wordIndex: 1 },
      shiftKey: false,
      toggleKey: true,
      touchSelection: true,
    });
  });

  it('offers an explicit mobile multi-selection entry point', async () => {
    await TestBed.configureTestingModule({ imports: [SongSheetComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SongSheetComponent);
    fixture.componentRef.setInput('lines', createSongLinesForm(DEFAULT_DOCUMENT));
    fixture.componentRef.setInput('selection', null);
    fixture.componentRef.setInput('selectedPositions', []);
    fixture.componentRef.setInput('touchSelectionActive', false);
    let requested = false;
    fixture.componentInstance.multiSelectionRequested.subscribe(() => (requested = true));
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector('[data-testid="start-multi-selection"]') as HTMLElement
    ).click();

    expect(requested).toBe(true);
  });

  it('offers one clear primary entry point for adding a song block', async () => {
    await TestBed.configureTestingModule({ imports: [SongSheetComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SongSheetComponent);
    fixture.componentRef.setInput('lines', createSongLinesForm(DEFAULT_DOCUMENT));
    fixture.componentRef.setInput('selection', null);
    fixture.componentRef.setInput('selectedPositions', []);
    fixture.componentRef.setInput('touchSelectionActive', false);
    let requested = false;
    fixture.componentInstance.blockAddRequested.subscribe(() => (requested = true));
    fixture.detectChanges();

    const addButton = fixture.nativeElement.querySelector(
      '[data-testid="add-song-block"]',
    ) as HTMLButtonElement;
    expect(addButton.textContent).toContain('Block am Liedende hinzufügen');
    addButton.click();

    expect(requested).toBe(true);
  });

  it('remembers a dismissed structure help without touching song storage', async () => {
    localStorage.setItem('kalimba-note-tool-v1', 'song-sentinel');
    await TestBed.configureTestingModule({ imports: [SongSheetComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SongSheetComponent);
    fixture.componentRef.setInput('lines', createSongLinesForm(DEFAULT_DOCUMENT));
    fixture.componentRef.setInput('selection', null);
    fixture.componentRef.setInput('selectedPositions', []);
    fixture.componentRef.setInput('touchSelectionActive', false);
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector('[data-testid="dismiss-structure-help"]') as HTMLElement
    ).click();
    fixture.detectChanges();

    expect(localStorage.getItem(SONG_STRUCTURE_HELP_HIDDEN_KEY)).toBe('true');
    expect(localStorage.getItem('kalimba-note-tool-v1')).toBe('song-sentinel');
    expect(
      fixture.nativeElement.querySelector('[data-testid="show-structure-help"]'),
    ).not.toBeNull();
  });
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.removeItem(SONG_STRUCTURE_HELP_HIDDEN_KEY);
  localStorage.removeItem('kalimba-note-tool-v1');
});
