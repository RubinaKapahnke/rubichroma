import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { DEFAULT_DOCUMENT } from '../../domain/default-document';
import { cloneDocument, SongDocument } from '../../domain/song-document';
import { ThemeService } from '../../infrastructure/theme.service';
import { SongEditorComponent } from './song-editor.component';
import { SongEditorStore } from './song-editor.store';

describe('SongEditorComponent hydration', () => {
  it('replaces the FormArray input reference and renders the imported snapshot immediately', async () => {
    const documentState = signal<SongDocument | null>(null);
    const hydrationVersionState = signal(0);
    const store = {
      document: documentState.asReadonly(),
      hydrationVersion: hydrationVersionState.asReadonly(),
      hasDocument: computed(() => documentState() !== null),
      status: signal('saved'),
      error: signal<string | null>(null),
      canUndo: signal(false),
      initialize: () => Promise.resolve(),
      updateEditorValue: () => null,
      saveEditorValue: () => Promise.resolve(),
    };
    const theme = {
      preference: signal('system'),
      setPreference: () => undefined,
    };

    await TestBed.configureTestingModule({
      imports: [SongEditorComponent],
      providers: [
        { provide: SongEditorStore, useValue: store },
        { provide: ThemeService, useValue: theme },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<SongEditorComponent> =
      TestBed.createComponent(SongEditorComponent);
    const emptyReference = fixture.componentInstance.lines();
    documentState.set(cloneDocument(DEFAULT_DOCUMENT));
    hydrationVersionState.set(1);
    fixture.detectChanges();
    await fixture.whenStable();
    const initialReference = fixture.componentInstance.lines();

    fixture.componentInstance.handleWordSelection({
      position: { lineIndex: 0, wordIndex: 0 },
      shiftKey: false,
      toggleKey: false,
      touchSelection: false,
    });
    fixture.componentInstance.handleWordSelection({
      position: { lineIndex: 0, wordIndex: 1 },
      shiftKey: true,
      toggleKey: false,
      touchSelection: false,
    });
    expect(fixture.componentInstance.selectedPositions()).toHaveLength(2);
    fixture.componentInstance.handleWordSelection({
      position: { lineIndex: 0, wordIndex: 0 },
      shiftKey: false,
      toggleKey: true,
      touchSelection: false,
    });
    expect(fixture.componentInstance.selectedPositions()).toEqual([{ lineIndex: 0, wordIndex: 1 }]);
    fixture.componentInstance.handleWordSelection({
      position: { lineIndex: 0, wordIndex: 0 },
      shiftKey: false,
      toggleKey: true,
      touchSelection: false,
    });

    const imported = cloneDocument(DEFAULT_DOCUMENT);
    imported.song.title = 'Prüflied ÄÖÜ';
    imported.song.lines[0].words[0].text = 'Grüße';
    documentState.set(imported);
    hydrationVersionState.set(2);
    fixture.detectChanges();
    await fixture.whenStable();

    const importedReference = fixture.componentInstance.lines();
    const renderedText = fixture.nativeElement.textContent as string;
    const titleInput = fixture.nativeElement.querySelector(
      '[data-testid="song-title"]',
    ) as HTMLInputElement;
    expect(initialReference).not.toBe(emptyReference);
    expect(importedReference).not.toBe(initialReference);
    expect(titleInput.value).toBe('Prüflied ÄÖÜ');
    expect(renderedText).toContain('Grüße');
    expect(renderedText).not.toContain('Willkommen');
    expect(fixture.componentInstance.selectedPositions()).toEqual([
      { lineIndex: 0, wordIndex: 0 },
      { lineIndex: 0, wordIndex: 1 },
    ]);
    expect(fixture.componentInstance.selection()).toEqual({ lineIndex: 0, wordIndex: 0 });
  });

  it('latches multi-selection until it is explicitly ended', async () => {
    const documentState = signal<SongDocument | null>(cloneDocument(DEFAULT_DOCUMENT));
    const hydrationVersionState = signal(1);
    const store = {
      document: documentState.asReadonly(),
      hydrationVersion: hydrationVersionState.asReadonly(),
      hasDocument: computed(() => documentState() !== null),
      status: signal('saved'),
      error: signal<string | null>(null),
      canUndo: signal(false),
      initialize: () => Promise.resolve(),
      updateEditorValue: () => null,
      saveEditorValue: () => Promise.resolve(),
    };
    const theme = { preference: signal('system'), setPreference: () => undefined };

    await TestBed.configureTestingModule({
      imports: [SongEditorComponent],
      providers: [
        { provide: SongEditorStore, useValue: store },
        { provide: ThemeService, useValue: theme },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SongEditorComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;

    component.handleWordSelection({
      position: { lineIndex: 0, wordIndex: 0 },
      shiftKey: false,
      toggleKey: false,
      touchSelection: false,
    });
    expect(component.interactionMode()).toBe('editing');
    expect(component.selectedWord()).not.toBeNull();

    component.handleWordSelection({
      position: { lineIndex: 0, wordIndex: 0 },
      shiftKey: false,
      toggleKey: true,
      touchSelection: true,
    });
    expect(component.interactionMode()).toBe('multi-select');
    expect(component.selectedWord()).toBeNull();

    component.handleWordSelection({
      position: { lineIndex: 0, wordIndex: 1 },
      shiftKey: false,
      toggleKey: false,
      touchSelection: false,
    });
    expect(component.interactionMode()).toBe('multi-select');
    expect(component.selectedPositions()).toEqual([{ lineIndex: 0, wordIndex: 1 }]);

    component.handleWordSelection({
      position: { lineIndex: 0, wordIndex: 1 },
      shiftKey: false,
      toggleKey: false,
      touchSelection: false,
    });
    expect(component.interactionMode()).toBe('multi-select');
    expect(component.selectedPositions()).toEqual([]);

    component.closeWordEditor();
    expect(component.interactionMode()).toBe('idle');
  });

  it('switches desktop Shift selection from editing to an ordered multi-selection', async () => {
    const documentState = signal<SongDocument | null>(cloneDocument(DEFAULT_DOCUMENT));
    const hydrationVersionState = signal(1);
    const store = {
      document: documentState.asReadonly(),
      hydrationVersion: hydrationVersionState.asReadonly(),
      hasDocument: computed(() => documentState() !== null),
      status: signal('saved'),
      error: signal<string | null>(null),
      canUndo: signal(false),
      initialize: () => Promise.resolve(),
      updateEditorValue: () => null,
      saveEditorValue: () => Promise.resolve(),
    };
    const theme = { preference: signal('system'), setPreference: () => undefined };

    await TestBed.configureTestingModule({
      imports: [SongEditorComponent],
      providers: [
        { provide: SongEditorStore, useValue: store },
        { provide: ThemeService, useValue: theme },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SongEditorComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.handleWordSelection({
      position: { lineIndex: 0, wordIndex: 0 },
      shiftKey: false,
      toggleKey: false,
      touchSelection: false,
    });
    fixture.componentInstance.handleWordSelection({
      position: { lineIndex: 0, wordIndex: 1 },
      shiftKey: true,
      toggleKey: false,
      touchSelection: false,
    });

    expect(fixture.componentInstance.interactionMode()).toBe('multi-select');
    expect(fixture.componentInstance.selectedPositions()).toEqual([
      { lineIndex: 0, wordIndex: 0 },
      { lineIndex: 0, wordIndex: 1 },
    ]);
    expect(fixture.componentInstance.selectedWord()).toBeNull();
  });
});
