import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DOCUMENT } from '../../domain/default-document';
import { cloneDocument } from '../../domain/song-document';
import { createSongLinesForm } from './song-editor-form';
import {
  SONG_STRUCTURE_HELP_HIDDEN_KEY,
  SongSheetComponent,
  WordSelectionGesture,
} from './song-sheet.component';

describe('SongSheetComponent desktop selection gestures', () => {
  it('renders a calm full-content view without editing controls', async () => {
    await TestBed.configureTestingModule({ imports: [SongSheetComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SongSheetComponent);
    fixture.componentRef.setInput('lines', createSongLinesForm(DEFAULT_DOCUMENT));
    fixture.componentRef.setInput('selection', null);
    fixture.componentRef.setInput('selectedPositions', []);
    fixture.componentRef.setInput('touchSelectionActive', false);
    const selections: WordSelectionGesture[] = [];
    fixture.componentInstance.wordSelect.subscribe((gesture) => selections.push(gesture));
    fixture.detectChanges();

    const firstCard = fixture.nativeElement.querySelector('.word-card') as HTMLButtonElement;
    expect(firstCard.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="add-song-block"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="line-drag-handle-0"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="word-preview-0-0"]')).toBeNull();
    firstCard.click();
    expect(selections).toEqual([]);
  });

  it('maps Shift and Ctrl/Command clicks without losing the clicked position', async () => {
    await TestBed.configureTestingModule({ imports: [SongSheetComponent] }).compileComponents();
    const fixture: ComponentFixture<SongSheetComponent> =
      TestBed.createComponent(SongSheetComponent);
    fixture.componentRef.setInput('lines', createSongLinesForm(DEFAULT_DOCUMENT));
    fixture.componentRef.setInput('editMode', true);
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
    fixture.componentRef.setInput('editMode', true);
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
    fixture.componentRef.setInput('editMode', true);
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
    fixture.componentRef.setInput('editMode', true);
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

  it('keeps block selection separate from accessible block and line previews', async () => {
    await TestBed.configureTestingModule({ imports: [SongSheetComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SongSheetComponent);
    fixture.componentRef.setInput('lines', createSongLinesForm(DEFAULT_DOCUMENT));
    fixture.componentRef.setInput('editMode', true);
    fixture.componentRef.setInput('selection', null);
    fixture.componentRef.setInput('selectedPositions', []);
    fixture.componentRef.setInput('touchSelectionActive', false);
    const words: unknown[] = [];
    const lines: number[] = [];
    const selections: WordSelectionGesture[] = [];
    fixture.componentInstance.wordPreviewRequested.subscribe((position) => words.push(position));
    fixture.componentInstance.linePreviewRequested.subscribe((line) => lines.push(line));
    fixture.componentInstance.wordSelect.subscribe((gesture) => selections.push(gesture));
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector('[data-testid="word-preview-0-0"]') as HTMLElement
    ).click();
    (fixture.nativeElement.querySelector('[data-testid="line-preview-0"]') as HTMLElement).click();

    expect(words).toEqual([{ lineIndex: 0, wordIndex: 0 }]);
    expect(lines).toEqual([0]);
    expect(selections).toEqual([]);
  });

  it('emits lossless block and line moves for drag-drop and keyboard alternatives', async () => {
    await TestBed.configureTestingModule({ imports: [SongSheetComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SongSheetComponent);
    const document = cloneDocument(DEFAULT_DOCUMENT);
    document.song.lines.push(structuredClone(document.song.lines[0]));
    fixture.componentRef.setInput('lines', createSongLinesForm(document));
    fixture.componentRef.setInput('editMode', true);
    fixture.componentRef.setInput('selection', null);
    fixture.componentRef.setInput('selectedPositions', []);
    fixture.componentRef.setInput('touchSelectionActive', false);
    const actions: unknown[] = [];
    fixture.componentInstance.structureAction.subscribe((action) => actions.push(action));
    fixture.detectChanges();

    fixture.componentInstance.draggedBlock.set({ lineIndex: 0, wordIndex: 0 });
    fixture.componentInstance.blockDropTarget.set({ lineIndex: 0, wordIndex: 1 });
    fixture.componentInstance.blockDropAfter.set(true);
    fixture.componentInstance.dropBlockNative({
      preventDefault: () => undefined,
      stopPropagation: () => undefined,
    } as DragEvent);
    fixture.componentInstance.moveBlockWithKeyboard(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true }),
      0,
      1,
    );
    fixture.componentInstance.draggedLine.set(0);
    fixture.componentInstance.lineDropTarget.set(1);
    fixture.componentInstance.lineDropAfter.set(true);
    fixture.componentInstance.dropLineNative({ preventDefault: () => undefined } as DragEvent);

    expect(actions).toEqual([
      {
        kind: 'move-block',
        lineIndex: 0,
        wordIndex: 0,
        targetLineIndex: 0,
        targetWordIndex: 1,
      },
      {
        kind: 'move-block',
        lineIndex: 0,
        wordIndex: 1,
        targetLineIndex: 0,
        targetWordIndex: 0,
      },
      { kind: 'move-line', lineIndex: 0, targetLineIndex: 1 },
    ]);
  });

  it('remembers a dismissed structure help without touching song storage', async () => {
    localStorage.setItem('kalimba-note-tool-v1', 'song-sentinel');
    await TestBed.configureTestingModule({ imports: [SongSheetComponent] }).compileComponents();
    const fixture = TestBed.createComponent(SongSheetComponent);
    fixture.componentRef.setInput('lines', createSongLinesForm(DEFAULT_DOCUMENT));
    fixture.componentRef.setInput('editMode', true);
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
