'use strict';

const STORAGE_KEY = 'kalimba-note-tool-v1';

const DEFAULT_KEYS = [
  { value: '2″', letter: 'D', color: '#b9bbb3', hand: 'L' },
  { value: '7′', letter: 'B', color: '#e18c87', hand: 'L' },
  { value: '5′', letter: 'G', color: '#5a8fd7', hand: 'L' },
  { value: '3′', letter: 'E', color: '#9aa892', hand: 'L' },
  { value: '1′', letter: 'C', color: '#69aa91', hand: 'L' },
  { value: '6', letter: 'A', color: '#75d29a', hand: 'L' },
  { value: '4', letter: 'F', color: '#eca6ac', hand: 'L' },
  { value: '2', letter: 'D', color: '#ef7b70', hand: 'L' },
  { value: '1', letter: 'C', color: '#e5a13a', hand: 'R' },
  { value: '3', letter: 'E', color: '#668fd8', hand: 'R' },
  { value: '5', letter: 'G', color: '#d78cc8', hand: 'R' },
  { value: '7', letter: 'B', color: '#728bd3', hand: 'R' },
  { value: '2′', letter: 'D', color: '#5bcf8d', hand: 'R' },
  { value: '4′', letter: 'F', color: '#a8d46d', hand: 'R' },
  { value: '6′', letter: 'A', color: '#c59ab8', hand: 'R' },
  { value: '1″', letter: 'C', color: '#7252b7', hand: 'R' },
  { value: '3″', letter: 'E', color: '#62bdd3', hand: 'R' }
];

const DEFAULT_SONG = {
  title: 'Die Schöne und das Biest',
  lines: [
    { words: [
      { text: 'Märchen', notation: '(13) 5' },
      { text: 'schreibt', notation: '7 1′ 4' },
      { text: 'die', notation: '-1 1 2' },
      { text: 'Zeit,', notation: '3 4 2 (13) 1' }
    ]},
    { words: [
      { text: 'immer', notation: '3 5 7 1′ (572′)' },
      { text: 'wieder', notation: '-2 5 2′ 4′ 3′' },
      { text: 'wahr,', notation: '-(135) 1' }
    ]},
    { words: [
      { text: 'eben', notation: '1′ 2′' },
      { text: 'kaum', notation: '3′ 4′' },
      { text: 'gekannt,', notation: '5′-3 5 7 1′' }
    ]},
    { words: [
      { text: 'dann', notation: '5′' },
      { text: 'doch', notation: '4′' },
      { text: 'zugewandt,', notation: '3′ 2′ (461′)-1 1 4 6' }
    ]},
    { words: [
      { text: 'unerwartet', notation: '4′ 3′ 2′ 1′ 5-2 2 5' },
      { text: 'klar.', notation: '5-2 4 (13) 1' }
    ]},
    { words: [
      { text: 'Wandel', notation: '3 5 7 1′' },
      { text: 'nur', notation: '4-1' },
      { text: 'zu', notation: '1 2 3' },
      { text: 'zweit,', notation: '4 2 (13) 1' }
    ]},
    { words: [
      { text: 'eh', notation: '' },
      { text: 'es', notation: '' },
      { text: 'sich', notation: '' },
      { text: 'erschließt,', notation: '' }
    ]},
    { words: [
      { text: 'beiden', notation: '3′-1 2′' },
      { text: 'war', notation: '3′' },
      { text: 'so', notation: '-3 5′' },
      { text: 'bang,', notation: '(461′)-1 1 4 6' }
    ]},
    { words: [
      { text: 'beide', notation: '(461′)-1' },
      { text: 'ohne', notation: '7 1′-3 3′' },
      { text: 'Zwang,', notation: '(24) 2 4 6' }
    ]},
    { words: [
      { text: 'die', notation: '3′-5' },
      { text: 'Schöne', notation: '4′ 2′ 3′' },
      { text: 'und', notation: '1′-(135)' },
      { text: 'das', notation: '2 3 5 1′' },
      { text: 'Biest.', notation: '2′ 3′ 5′ 1″ 1' }
    ]},
    { words: [
      { text: 'Ewig', notation: '1′ 2′ 3′' },
      { text: 'wie', notation: '4′ 5′-3' },
      { text: 'die', notation: '5 7 1′' },
      { text: 'Zeit,', notation: '3′ 2′ (461′)-1 1 4 6' }
    ]},
    { words: [
      { text: 'ewig', notation: '1′ 2′ 3′' },
      { text: 'und', notation: '4′' },
      { text: 'bereit,', notation: '5′-3 5 7 1′' }
    ]}
  ]
};

const DEFAULT_STATE = { song: DEFAULT_SONG, keys: DEFAULT_KEYS };

let state = loadState();
let selection = { line: 0, word: 0 };
let insertMode = 'single';
let chordDraft = [];
let history = [];
let fieldStartSnapshot = null;
let fieldHistoryCaptured = false;
let pendingMelodyLine = null;
let pendingSyllableSelection = null;
let pendingSyllableOriginal = '';
let pendingSyllableSuggestion = '';
let draggedWord = null;
let pointerDrag = null;
let suppressNextWordClick = false;
let toastTimer = null;
let modeSelectionWord = null;
let copiedNotation = null;
let multiSelectMode = false;
let multiSelection = [];
let multiSelectionAnchor = null;
let multiSelectionFocus = null;
let multiSelectionInteraction = null;
let longPressTimer = null;
let lastPointerType = 'mouse';

const elements = {
  sheet: document.getElementById('song-sheet'),
  songTitle: document.getElementById('song-title'),
  printTitle: document.getElementById('print-title'),
  saveStatus: document.getElementById('save-status'),
  undo: document.getElementById('undo-button'),
  export: document.getElementById('export-button'),
  import: document.getElementById('import-button'),
  importFile: document.getElementById('import-file'),
  print: document.getElementById('print-button'),
  addLine: document.getElementById('add-line-button'),
  selectionHeading: document.getElementById('selection-heading'),
  selectionLabel: document.getElementById('selection-label'),
  wordText: document.getElementById('word-text'),
  wordNotation: document.getElementById('word-notation'),
  melodyCountField: document.getElementById('melody-count-field'),
  melodyToneCount: document.getElementById('melody-tone-count'),
  moveLeft: document.getElementById('move-left-button'),
  moveRight: document.getElementById('move-right-button'),
  addWord: document.getElementById('add-word-button'),
  duplicateWord: document.getElementById('duplicate-word-button'),
  copyNotes: document.getElementById('copy-notes-button'),
  pasteNotes: document.getElementById('paste-notes-button'),
  notesClipboardStatus: document.getElementById('notes-clipboard-status'),
  assignSequence: document.getElementById('assign-sequence-button'),
  multiSelectStatus: document.getElementById('multi-select-status'),
  splitSyllables: document.getElementById('split-syllables-button'),
  instrumental: document.getElementById('instrumental-button'),
  deleteWord: document.getElementById('delete-word-button'),
  palette: document.getElementById('key-palette'),
  existingNotesStatus: document.getElementById('existing-notes-status'),
  chordControls: document.getElementById('chord-controls'),
  chordDraft: document.getElementById('chord-draft'),
  insertChord: document.getElementById('insert-chord-button'),
  clearChord: document.getElementById('clear-chord-button'),
  insertSeparator: document.getElementById('insert-separator-button'),
  clearNotation: document.getElementById('clear-notation-button'),
  keySettings: document.getElementById('key-settings-grid'),
  reset: document.getElementById('reset-button'),
  melodyDialog: document.getElementById('melody-dialog'),
  melodyForm: document.getElementById('melody-form'),
  newMelodyToneCount: document.getElementById('new-melody-tone-count'),
  cancelMelody: document.getElementById('cancel-melody-button'),
  syllableDialog: document.getElementById('syllable-dialog'),
  syllableForm: document.getElementById('syllable-form'),
  syllableInput: document.getElementById('syllable-input'),
  syllableSuggestionStatus: document.getElementById('syllable-suggestion-status'),
  distributeNotes: document.getElementById('distribute-notes-checkbox'),
  cancelSyllable: document.getElementById('cancel-syllable-button'),
  sequenceDialog: document.getElementById('sequence-dialog'),
  sequenceForm: document.getElementById('sequence-form'),
  sequenceNotation: document.getElementById('sequence-notation'),
  sequenceTargetStatus: document.getElementById('sequence-target-status'),
  sequencePreviewStatus: document.getElementById('sequence-preview-status'),
  sequencePreview: document.getElementById('sequence-preview'),
  cancelSequence: document.getElementById('cancel-sequence-button'),
  selectionToolbar: document.getElementById('selection-toolbar'),
  selectionToolbarStatus: document.getElementById('selection-toolbar-status'),
  selectionToolbarDetail: document.getElementById('selection-toolbar-detail'),
  toolbarLine: document.getElementById('toolbar-line-button'),
  toolbarSequence: document.getElementById('toolbar-sequence-button'),
  toolbarCopy: document.getElementById('toolbar-copy-button'),
  toolbarPaste: document.getElementById('toolbar-paste-button'),
  toolbarRemoveLast: document.getElementById('toolbar-remove-last-button'),
  toolbarClear: document.getElementById('toolbar-clear-button'),
  toolbarCancel: document.getElementById('toolbar-cancel-button'),
  toast: document.getElementById('toast')
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function snapshot() {
  return JSON.stringify(state);
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return clone(DEFAULT_STATE);
    const parsed = JSON.parse(saved);
    validateState(parsed);
    normalizeSyllableSpacing(parsed);
    return parsed;
  } catch (error) {
    console.warn('Gespeicherte Daten konnten nicht geladen werden.', error);
    return clone(DEFAULT_STATE);
  }
}

function validateState(candidate) {
  if (!candidate || typeof candidate !== 'object') throw new Error('Ungültige Sicherung');
  if (!candidate.song || typeof candidate.song.title !== 'string' || !Array.isArray(candidate.song.lines)) {
    throw new Error('Lieddaten fehlen');
  }
  if (!Array.isArray(candidate.keys) || candidate.keys.length !== 17) {
    throw new Error('Kalimba-Konfiguration muss 17 Zungen enthalten');
  }
  candidate.song.lines.forEach(line => {
    if (!Array.isArray(line.words)) throw new Error('Eine Liedzeile ist ungültig');
    line.words.forEach(word => {
      if (typeof word.text !== 'string' || typeof word.notation !== 'string') {
        throw new Error('Ein Wort ist ungültig');
      }
    });
  });
}

function normalizeSyllableSpacing(candidate) {
  candidate.song.lines.forEach(line => {
    line.words.forEach(word => {
      if (/\s*-$/.test(word.text)) {
        word.text = `${word.text.replace(/\s*-$/, '')} -`;
      }
    });
  });
}

const GERMAN_SYLLABLE_DICTIONARY = new Map([
  ['märchen', 'mär-chen'],
  ['unerwartet', 'un-er-war-tet'],
  ['altbekannt', 'alt-be-kannt'],
  ['bittersüß', 'bit-ter-süß'],
  ['einsehen', 'ein-se-hen'],
  ['erschließt', 'er-schließt'],
  ['imposant', 'im-po-sant']
]);

function suggestGermanSyllables(text) {
  const match = String(text).trim().match(/^([^A-Za-zÄÖÜäöüßẞ]*)([A-Za-zÄÖÜäöüßẞ]+)(.*)$/u);
  if (!match) return String(text).trim();
  const [, prefix, originalWord, suffix] = match;
  const lowerWord = originalWord.toLocaleLowerCase('de-DE');
  const dictionarySuggestion = GERMAN_SYLLABLE_DICTIONARY.get(lowerWord);
  const lowerSuggestion = dictionarySuggestion || hyphenateGermanWordHeuristically(lowerWord);
  const beginsUppercase = originalWord[0] === originalWord[0].toLocaleUpperCase('de-DE');
  const casedSuggestion = beginsUppercase
    ? `${lowerSuggestion[0].toLocaleUpperCase('de-DE')}${lowerSuggestion.slice(1)}`
    : lowerSuggestion;
  return `${prefix}${casedSuggestion}${suffix}`;
}

function hyphenateGermanWordHeuristically(word) {
  const vowels = new Set(['a', 'e', 'i', 'o', 'u', 'y', 'ä', 'ö', 'ü']);
  const combinedVowels = new Set(['au', 'äu', 'eu', 'ei', 'ai', 'ey', 'ay', 'ie', 'aa', 'ee', 'oo']);
  const onsetClusters = [
    'schl', 'schr', 'schw', 'spr', 'str', 'spl',
    'sch', 'ch', 'ph', 'th', 'pf', 'st', 'sp',
    'tr', 'dr', 'kr', 'gr', 'pr', 'br', 'fr', 'fl',
    'kl', 'gl', 'bl', 'pl', 'zw', 'qu'
  ];
  const nuclei = [];

  for (let index = 0; index < word.length; index += 1) {
    if (!vowels.has(word[index])) continue;
    const pair = word.slice(index, index + 2);
    const length = combinedVowels.has(pair) ? 2 : 1;
    nuclei.push({ start: index, end: index + length });
    index += length - 1;
  }

  if (nuclei.length < 2) return word;
  const boundaries = [];
  nuclei.slice(0, -1).forEach((nucleus, index) => {
    const nextNucleus = nuclei[index + 1];
    const cluster = word.slice(nucleus.end, nextNucleus.start);
    let onsetLength = 0;

    if (cluster.length === 1) {
      onsetLength = 1;
    } else if (cluster.length > 1) {
      const onset = onsetClusters.find(candidate => cluster.endsWith(candidate));
      onsetLength = onset ? onset.length : 1;
    }

    const boundary = cluster.length === 0
      ? nextNucleus.start
      : nextNucleus.start - onsetLength;
    if (boundary > 0 && boundary < word.length && boundary > (boundaries.at(-1) || 0)) {
      boundaries.push(boundary);
    }
  });

  if (!boundaries.length) return word;
  const parts = [];
  let start = 0;
  boundaries.forEach(boundary => {
    parts.push(word.slice(start, boundary));
    start = boundary;
  });
  parts.push(word.slice(start));
  return parts.filter(Boolean).join('-');
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  elements.saveStatus.textContent = `Gespeichert ${time}`;
}

function commit(mutator, message) {
  history.push(snapshot());
  if (history.length > 50) history.shift();
  mutator();
  normalizeSelection();
  persist();
  renderAll();
  if (message) showToast(message);
}

function beginFieldEdit() {
  fieldStartSnapshot = snapshot();
  fieldHistoryCaptured = false;
}

function captureFieldHistory() {
  if (!fieldHistoryCaptured) {
    const beforeEdit = fieldStartSnapshot || snapshot();
    if (beforeEdit !== snapshot()) return;
    history.push(beforeEdit);
    if (history.length > 50) history.shift();
    fieldHistoryCaptured = true;
    updateUndoButton();
  }
}

function finishFieldEdit() {
  if (fieldHistoryCaptured && history[history.length - 1] === snapshot()) {
    history.pop();
  }
  if (!fieldHistoryCaptured && fieldStartSnapshot && fieldStartSnapshot !== snapshot()) {
    history.push(fieldStartSnapshot);
    if (history.length > 50) history.shift();
  }
  fieldStartSnapshot = null;
  fieldHistoryCaptured = false;
  updateUndoButton();
}

function undo() {
  const previous = history.pop();
  if (!previous) return;
  const preserveMultiSelection = multiSelectMode;
  state = JSON.parse(previous);
  if (preserveMultiSelection) {
    multiSelection = multiSelection.filter(item => state.song.lines[item.line]?.words[item.word]);
    if (multiSelection.length === 0) clearMultiSelection();
  } else {
    clearMultiSelection();
  }
  normalizeSelection();
  persist();
  renderAll();
  showToast('Letzte Änderung rückgängig gemacht');
}

function normalizeSelection() {
  if (state.song.lines.length === 0) {
    state.song.lines.push({ words: [{ text: '', notation: '' }] });
  }
  selection.line = Math.max(0, Math.min(selection.line, state.song.lines.length - 1));
  const line = state.song.lines[selection.line];
  if (line.words.length === 0) line.words.push({ text: '', notation: '' });
  selection.word = Math.max(0, Math.min(selection.word, line.words.length - 1));
}

function selectedWord() {
  normalizeSelection();
  return state.song.lines[selection.line].words[selection.word];
}

function orderedMultiSelection() {
  return multiSelection
    .filter(item => state.song.lines[item.line]?.words[item.word])
    .sort((first, second) => first.line - second.line || first.word - second.word);
}

function allWordCoordinates() {
  return state.song.lines.flatMap((line, lineIndex) =>
    line.words.map((word, wordIndex) => ({ line: lineIndex, word: wordIndex }))
  );
}

function captureFocusToken() {
  const active = document.activeElement;
  const wordUnit = active?.closest?.('.word-unit');
  if (wordUnit) {
    return {
      type: 'word',
      line: Number(wordUnit.dataset.lineIndex),
      word: Number(wordUnit.dataset.wordIndex)
    };
  }

  const keyButton = active?.closest?.('.key-button');
  if (keyButton?.dataset.keyValue) return { type: 'key', value: keyButton.dataset.keyValue };
  if (active?.id) return { type: 'id', id: active.id };
  return active === document.body ? { type: 'word', ...selection } : null;
}

function wordButtonAt(coordinate = selection) {
  return Array.from(elements.sheet.querySelectorAll('.word-unit')).find(unit =>
    Number(unit.dataset.lineIndex) === coordinate.line &&
    Number(unit.dataset.wordIndex) === coordinate.word
  );
}

function restoreFocusToken(token) {
  let target = null;
  if (token?.type === 'word') target = wordButtonAt(token);
  if (token?.type === 'key') {
    target = Array.from(elements.palette.querySelectorAll('.key-button'))
      .find(button => button.dataset.keyValue === token.value);
  }
  if (token?.type === 'id') target = document.getElementById(token.id);
  const isUnavailable = !target || target.disabled || target.closest?.('[hidden]') || target.getClientRects().length === 0;
  if (isUnavailable) target = wordButtonAt(multiSelectionFocus || selection);
  target?.focus({ preventScroll: true });
}

function focusEditorAfterTouchSelection() {
  if (lastPointerType === 'mouse' || !window.matchMedia('(max-width: 760px)').matches) return;
  requestAnimationFrame(() => {
    document.querySelector('.editor-core')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    elements.wordText.focus({ preventScroll: true });
  });
}

function selectMultiRange(targetLine, targetWord) {
  if (!multiSelectionAnchor) multiSelectionAnchor = { ...selection };
  const coordinates = allWordCoordinates();
  const anchorIndex = coordinates.findIndex(item =>
    item.line === multiSelectionAnchor.line && item.word === multiSelectionAnchor.word
  );
  const targetIndex = coordinates.findIndex(item => item.line === targetLine && item.word === targetWord);
  if (anchorIndex === -1 || targetIndex === -1) return;

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  multiSelectMode = true;
  multiSelectionFocus = { line: targetLine, word: targetWord };
  multiSelectionInteraction ||= 'range';
  multiSelection = coordinates.slice(start, end + 1);
  renderAll({ type: 'word', line: targetLine, word: targetWord });
}

function toggleIndividualMultiSelection(line, word, interaction = 'modifier') {
  if (!multiSelectMode) {
    multiSelectMode = true;
    multiSelectionAnchor = { ...selection };
    multiSelection = [{ ...selection }];
  }
  multiSelectionInteraction = interaction;
  multiSelectionFocus = { line, word };
  const existingIndex = multiSelection.findIndex(item => item.line === line && item.word === word);
  if (existingIndex >= 0) {
    multiSelection.splice(existingIndex, 1);
  } else {
    multiSelection.push({ line, word });
  }
  if (multiSelection.length === 0) {
    selection = { line, word };
    clearMultiSelection();
  }
  renderAll({ type: 'word', ...(multiSelectionFocus || selection) });
}

function startTouchMultiSelection(line, word) {
  selection = { line, word };
  multiSelectMode = true;
  multiSelection = [{ line, word }];
  multiSelectionAnchor = { line, word };
  multiSelectionFocus = { line, word };
  multiSelectionInteraction = 'touch';
  pointerDrag = null;
  suppressNextWordClick = true;
  renderAll({ type: 'word', line, word });
  showToast('Mehrfachauswahl gestartet – weitere Blöcke antippen');
}

function selectFocusedLine() {
  const line = multiSelectionFocus?.line ?? selection.line;
  const words = state.song.lines[line]?.words || [];
  if (!words.length) return;
  multiSelectMode = true;
  multiSelectionInteraction = 'line';
  multiSelection = words.map((word, wordIndex) => ({ line, word: wordIndex }));
  multiSelectionAnchor = { line, word: 0 };
  multiSelectionFocus = { line, word: words.length - 1 };
  selection = { line, word: Math.min(selection.line === line ? selection.word : 0, words.length - 1) };
  renderAll({ type: 'word', ...multiSelectionFocus });
  showToast(`Zeile ${line + 1} vollständig markiert`);
}

function extendSelectionWithArrow(key) {
  const coordinates = allWordCoordinates();
  const current = multiSelectionFocus || { ...selection };
  let target = null;
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const index = coordinates.findIndex(item => item.line === current.line && item.word === current.word);
    const offset = key === 'ArrowLeft' ? -1 : 1;
    target = coordinates[Math.max(0, Math.min(coordinates.length - 1, index + offset))];
  } else {
    const lineOffset = key === 'ArrowUp' ? -1 : 1;
    const line = Math.max(0, Math.min(state.song.lines.length - 1, current.line + lineOffset));
    const word = Math.max(0, Math.min(current.word, state.song.lines[line].words.length - 1));
    target = { line, word };
  }
  if (!target) return;
  multiSelectionInteraction = 'keyboard';
  selectMultiRange(target.line, target.word);
}

function clearMultiSelection() {
  clearTimeout(longPressTimer);
  longPressTimer = null;
  multiSelectMode = false;
  multiSelection = [];
  multiSelectionAnchor = null;
  multiSelectionFocus = null;
  multiSelectionInteraction = null;
}

function setInsertModeFromWord(word) {
  const containsChord = parseNotation(word.notation).some(event => event.type === 'chord');
  insertMode = containsChord ? 'chord' : 'single';
  chordDraft = [];
  document.querySelectorAll('input[name="insert-mode"]').forEach(input => {
    input.checked = input.value === insertMode;
  });
}

function clearDropIndicators() {
  document.querySelectorAll('.drop-before, .drop-after, .is-drop-target').forEach(element => {
    element.classList.remove('drop-before', 'drop-after', 'is-drop-target');
  });
}

function updatePointerDropTarget(clientX, clientY) {
  if (!pointerDrag?.active) return;
  clearDropIndicators();
  const element = document.elementFromPoint(clientX, clientY);
  const targetUnit = element?.closest('.word-unit');
  const targetRow = element?.closest('.word-row');

  if (targetUnit) {
    const targetLine = Number(targetUnit.dataset.lineIndex);
    const targetWord = Number(targetUnit.dataset.wordIndex);
    const bounds = targetUnit.getBoundingClientRect();
    const after = clientX >= bounds.left + bounds.width / 2;
    targetUnit.classList.add(after ? 'drop-after' : 'drop-before');
    pointerDrag.target = { line: targetLine, word: targetWord + (after ? 1 : 0) };
    return;
  }

  if (targetRow) {
    const targetLine = Number(targetRow.dataset.lineIndex);
    targetRow.classList.add('is-drop-target');
    pointerDrag.target = { line: targetLine, word: state.song.lines[targetLine].words.length };
    return;
  }

  pointerDrag.target = null;
}

function finishPointerDrag(cancelled = false) {
  if (!pointerDrag) return;
  const dragState = pointerDrag;
  pointerDrag = null;
  dragState.ghost?.remove();
  clearDropIndicators();
  draggedWord = null;

  if (!cancelled && dragState.active && dragState.target) {
    moveWordBlock(dragState.source, dragState.target.line, dragState.target.word);
  }
}

function moveWordBlock(source, targetLineIndex, targetWordIndex) {
  const sourceLine = state.song.lines[source.line];
  const targetLine = state.song.lines[targetLineIndex];
  if (!sourceLine || !targetLine || !sourceLine.words[source.word]) return;

  let normalizedTargetIndex = targetWordIndex;
  if (source.line === targetLineIndex && source.word < normalizedTargetIndex) {
    normalizedTargetIndex -= 1;
  }
  normalizedTargetIndex = Math.max(0, Math.min(normalizedTargetIndex, targetLine.words.length - (source.line === targetLineIndex ? 1 : 0)));
  if (source.line === targetLineIndex && normalizedTargetIndex === source.word) return;

  commit(() => {
    const [block] = sourceLine.words.splice(source.word, 1);
    const insertionIndex = Math.max(0, Math.min(normalizedTargetIndex, targetLine.words.length));
    targetLine.words.splice(insertionIndex, 0, block);
    selection = { line: targetLineIndex, word: insertionIndex };
  }, source.line === targetLineIndex ? 'Block verschoben' : 'Block in eine andere Zeile verschoben');
}

function keyMap() {
  return new Map(state.keys.map(key => [key.value, key]));
}

function normalizeNotation(source) {
  return String(source || '')
    .replace(/[’']/g, '′')
    .replace(/[”"]/g, '″')
    .replace(/′′/g, '″');
}

function parseNotation(source) {
  const notation = normalizeNotation(source);
  const events = [];
  let index = 0;

  while (index < notation.length) {
    const char = notation[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === '-') {
      events.push({ type: 'separator' });
      index += 1;
      continue;
    }
    if (char === '(') {
      const closing = notation.indexOf(')', index + 1);
      if (closing === -1) {
        index += 1;
        continue;
      }
      const chordSource = notation.slice(index + 1, closing);
      const values = chordSource.match(/[1-7](?:[′]{1,2}|[″])?/g) || [];
      if (values.length) events.push({ type: 'chord', values: values.map(normalizeNotation) });
      index = closing + 1;
      continue;
    }
    const match = notation.slice(index).match(/^[1-7](?:[′]{1,2}|[″])?/);
    if (match) {
      events.push({ type: 'note', value: normalizeNotation(match[0]) });
      index += match[0].length;
      continue;
    }
    index += 1;
  }

  return events;
}

function serializeNotationEvents(events) {
  return events
    .map(event => {
      if (event.type === 'separator') return '-';
      if (event.type === 'chord') return `(${event.values.join('')})`;
      return event.value;
    })
    .join(' ')
    .replace(/\s*-\s*/g, '-')
    .trim();
}

function removeLastPitchOccurrence(notation, value) {
  const events = parseNotation(notation);

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.type === 'note' && event.value === value) {
      events.splice(index, 1);
      break;
    }
    if (event.type === 'chord' && event.values.includes(value)) {
      const remaining = [...event.values];
      remaining.splice(remaining.lastIndexOf(value), 1);
      if (remaining.length >= 2) {
        events[index] = { type: 'chord', values: remaining };
      } else if (remaining.length === 1) {
        events[index] = { type: 'note', value: remaining[0] };
      } else {
        events.splice(index, 1);
      }
      break;
    }
  }

  return serializeNotationEvents(events);
}

function distributeNotationAcrossSyllables(notation, syllableCount) {
  const events = parseNotation(notation);
  const playableTotal = events.filter(event => event.type !== 'separator').length;
  const baseCount = Math.floor(playableTotal / syllableCount);
  const remainder = playableTotal % syllableCount;
  const targetCounts = Array.from(
    { length: syllableCount },
    (_, index) => baseCount + (index < remainder ? 1 : 0)
  );
  const groups = Array.from({ length: syllableCount }, () => []);
  let groupIndex = 0;
  let playableInGroup = 0;

  events.forEach(event => {
    if (event.type !== 'separator') {
      while (
        groupIndex < syllableCount - 1 &&
        playableInGroup >= targetCounts[groupIndex]
      ) {
        groupIndex += 1;
        playableInGroup = 0;
      }
      playableInGroup += 1;
    }
    groups[groupIndex].push(event);
  });

  return groups.map(serializeNotationEvents);
}

function distributeSequenceAcrossTargets(notation, targetCount) {
  const events = parseNotation(notation).filter(event => event.type !== 'separator');
  const baseCount = Math.floor(events.length / targetCount);
  const remainder = events.length % targetCount;
  const groups = [];
  let cursor = 0;

  for (let index = 0; index < targetCount; index += 1) {
    const count = baseCount + (index < remainder ? 1 : 0);
    groups.push(serializeNotationEvents(events.slice(cursor, cursor + count)));
    cursor += count;
  }

  return groups;
}

function syllableWeightForWord(word) {
  if (word.text === '♪') return Math.max(1, Number(word.toneCount) || 1);
  const plain = word.text.replace(/\s+-\s*$/, '').trim();
  return Math.max(1, suggestGermanSyllables(plain).split('-').filter(Boolean).length);
}

function distributeEventsByWeights(events, weights) {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0) || weights.length;
  const exactShares = weights.map(weight => events.length * weight / weightSum);
  const counts = exactShares.map(share => Math.max(1, Math.floor(share)));
  let difference = events.length - counts.reduce((sum, count) => sum + count, 0);
  const ranked = exactShares
    .map((share, index) => ({ index, remainder: share - Math.floor(share) }))
    .sort((first, second) => second.remainder - first.remainder || first.index - second.index);
  let cursorAdjustment = 0;
  while (difference > 0) {
    counts[ranked[cursorAdjustment % ranked.length].index] += 1;
    cursorAdjustment += 1;
    difference -= 1;
  }
  cursorAdjustment = ranked.length - 1;
  while (difference < 0) {
    const candidate = ranked[cursorAdjustment % ranked.length].index;
    if (counts[candidate] > 1) {
      counts[candidate] -= 1;
      difference += 1;
    }
    cursorAdjustment = (cursorAdjustment - 1 + ranked.length) % ranked.length;
  }

  let cursor = 0;
  return counts.map(count => {
    const notation = serializeNotationEvents(events.slice(cursor, cursor + count));
    cursor += count;
    return notation;
  });
}

function buildSequenceAssignments(notation, targets, distribution) {
  const events = parseNotation(notation).filter(event => event.type !== 'separator');
  if (events.length === 0) {
    return { assignments: [], error: 'Bitte mindestens einen gültigen Ton oder Akkord eingeben.', unused: 0 };
  }
  if (distribution !== 'repeat' && events.length < targets.length) {
    return {
      assignments: [],
      error: `Bitte mindestens ${targets.length} Tonereignisse für ${targets.length} markierte Blöcke eingeben.`,
      unused: 0
    };
  }
  if (distribution === 'repeat') {
    return { assignments: Array(targets.length).fill(notation), error: '', unused: 0 };
  }
  if (distribution === 'one') {
    return {
      assignments: targets.map((target, index) => serializeNotationEvents([events[index]])),
      error: '',
      unused: Math.max(0, events.length - targets.length)
    };
  }
  if (distribution === 'syllables') {
    const weights = targets.map(target => syllableWeightForWord(state.song.lines[target.line].words[target.word]));
    return { assignments: distributeEventsByWeights(events, weights), error: '', unused: 0 };
  }
  return { assignments: distributeSequenceAcrossTargets(notation, targets.length), error: '', unused: 0 };
}

function mergeAssignedNotation(current, assigned, mergeMode) {
  const existing = current.trim();
  if (mergeMode === 'empty') return existing || assigned;
  if (mergeMode === 'prepend') return normalizeNotation(existing ? `${assigned} ${existing}` : assigned);
  if (mergeMode === 'append') return normalizeNotation(existing ? `${existing} ${assigned}` : assigned);
  return assigned;
}

function updateSequencePreview() {
  const targets = orderedMultiSelection();
  const notation = normalizeNotation(elements.sequenceNotation.value.trim());
  const distribution = document.querySelector('input[name="sequence-distribution"]:checked')?.value || 'even';
  const mergeMode = document.querySelector('input[name="sequence-merge"]:checked')?.value || 'replace';
  const result = buildSequenceAssignments(notation, targets, distribution);
  elements.sequencePreview.replaceChildren();

  if (!notation) {
    elements.sequencePreviewStatus.textContent = 'Die Vorschau erscheint, sobald eine Tonfolge eingegeben wurde.';
    return result;
  }
  if (result.error) {
    elements.sequencePreviewStatus.textContent = result.error;
    return result;
  }

  elements.sequencePreviewStatus.textContent = result.unused
    ? `${result.unused} zusätzliche Tonereignisse bleiben bei dieser Verteilung ungenutzt.`
    : `${parseNotation(notation).filter(event => event.type !== 'separator').length} Tonereignisse werden auf ${targets.length} Blöcke angewendet.`;
  targets.forEach((target, index) => {
    const word = state.song.lines[target.line].words[target.word];
    const finalNotation = mergeAssignedNotation(word.notation, result.assignments[index], mergeMode);
    const row = document.createElement('div');
    row.className = 'sequence-preview-row';
    const label = document.createElement('span');
    label.className = 'sequence-preview-word';
    label.textContent = `${index + 1}. ${word.text === '♪' ? '♪ Melodie' : (word.text || '(leer)')}`;
    const previewNotation = document.createElement('span');
    previewNotation.className = 'sequence-preview-notation';
    previewNotation.textContent = finalNotation || 'keine Noten';
    row.append(label, previewNotation);
    elements.sequencePreview.appendChild(row);
  });
  return result;
}

function openSequenceDialog() {
  const targets = orderedMultiSelection();
  if (targets.length < 2) return;
  elements.sequenceNotation.value = '';
  elements.sequenceNotation.setCustomValidity('');
  document.querySelector('input[name="sequence-distribution"][value="even"]').checked = true;
  document.querySelector('input[name="sequence-merge"][value="replace"]').checked = true;
  elements.sequenceTargetStatus.textContent = `${targets.length} markierte Blöcke erhalten die Tonfolge in Liedreihenfolge.`;
  updateSequencePreview();
  elements.sequenceDialog.showModal();
  elements.sequenceNotation.focus();
}

function appendToneContent(target, key, displayValue = key.value) {
  const letter = document.createElement('span');
  letter.className = 'note-letter';
  letter.textContent = key.letter;
  target.appendChild(letter);

  const number = document.createElement('span');
  number.className = 'note-number';
  number.textContent = displayValue;
  target.appendChild(number);

  if (key.hand === 'R') {
    const hand = document.createElement('sup');
    hand.className = 'hand-marker';
    hand.textContent = 'R';
    target.appendChild(hand);
  }
}

function renderNoteEvent(event, keys) {
  if (event.type === 'separator') {
    const separator = document.createElement('span');
    separator.className = 'separator';
    separator.textContent = '–';
    separator.setAttribute('aria-hidden', 'true');
    return separator;
  }

  if (event.type === 'note') {
    const key = keys.get(event.value);
    if (!key) return renderUnknown(event.value);
    const note = document.createElement('span');
    note.className = 'note';
    note.style.setProperty('--note-color', key.color);
    note.setAttribute('aria-label', `${key.letter} ${key.value}${key.hand === 'R' ? ', rechte Hand' : ''}`);
    appendToneContent(note, key);
    return note;
  }

  const chordKeys = event.values.map(value => keys.get(value)).filter(Boolean);
  if (!chordKeys.length) return renderUnknown(event.values.join(''));
  const chord = document.createElement('span');
  chord.className = 'chord';
  const colorStops = chordKeys.map((key, index) => {
    const start = (index / chordKeys.length) * 100;
    const end = ((index + 1) / chordKeys.length) * 100;
    return `color-mix(in srgb, ${key.color} 78%, white) ${start}% ${end}%`;
  });
  chord.style.setProperty('--chord-background', `linear-gradient(90deg, ${colorStops.join(', ')})`);

  const letters = document.createElement('span');
  letters.className = 'note-letter chord-values';
  chordKeys.forEach((key, index) => {
    if (index > 0) {
      const plus = document.createElement('span');
      plus.className = 'chord-plus';
      plus.textContent = '+';
      letters.appendChild(plus);
    }
    const value = document.createElement('span');
    value.className = 'chord-value';
    value.textContent = key.letter;
    if (key.hand === 'R') {
      const hand = document.createElement('sup');
      hand.className = 'chord-inline-hand';
      hand.textContent = 'R';
      value.appendChild(hand);
    }
    letters.appendChild(value);
  });
  chord.appendChild(letters);

  const numbers = document.createElement('span');
  numbers.className = 'note-number chord-values';
  chordKeys.forEach((key, index) => {
    if (index > 0) {
      const plus = document.createElement('span');
      plus.className = 'chord-plus';
      plus.textContent = '+';
      numbers.appendChild(plus);
    }
    const value = document.createElement('span');
    value.className = 'chord-value';
    value.textContent = key.value;
    numbers.appendChild(value);
  });
  chord.appendChild(numbers);

  chord.setAttribute('aria-label', `Gleichzeitig: ${chordKeys.map(key => `${key.letter} ${key.value}`).join(', ')}`);
  return chord;
}

function renderUnknown(value) {
  const unknown = document.createElement('span');
  unknown.className = 'note';
  unknown.style.setProperty('--note-color', '#cccccc');
  unknown.textContent = value;
  unknown.setAttribute('aria-label', `Unbekannte Note ${value}`);
  return unknown;
}

function renderSheet() {
  elements.sheet.replaceChildren();
  elements.sheet.classList.toggle('is-multi-selecting', multiSelectMode);
  const keys = keyMap();
  const multiOrder = new Map(orderedMultiSelection().map((item, index) => [`${item.line}:${item.word}`, index + 1]));

  const rovingCoordinate = multiSelectMode ? (multiSelectionFocus || selection) : selection;

  state.song.lines.forEach((line, lineIndex) => {
    const lineElement = document.createElement('section');
    lineElement.className = 'song-line';

    const controls = document.createElement('div');
    controls.className = 'line-controls no-print';
    controls.innerHTML = `<span class="line-number">Zeile ${lineIndex + 1}</span>`;

    const addWord = document.createElement('button');
    addWord.type = 'button';
    addWord.className = 'mini-button';
    addWord.textContent = '+ Wort';
    addWord.disabled = multiSelectMode;
    addWord.addEventListener('click', () => {
      commit(() => {
        line.words.push({ text: 'Neues Wort', notation: '' });
        selection = { line: lineIndex, word: line.words.length - 1 };
      }, 'Wort hinzugefügt');
    });
    controls.appendChild(addWord);

    const addMelody = document.createElement('button');
    addMelody.type = 'button';
    addMelody.className = 'mini-button';
    addMelody.textContent = '+ Melodie';
    addMelody.disabled = multiSelectMode;
    addMelody.addEventListener('click', () => {
      pendingMelodyLine = lineIndex;
      elements.newMelodyToneCount.value = '4';
      elements.melodyDialog.showModal();
      elements.newMelodyToneCount.focus();
      elements.newMelodyToneCount.select();
    });
    controls.appendChild(addMelody);

    const duplicateLine = document.createElement('button');
    duplicateLine.type = 'button';
    duplicateLine.className = 'mini-button';
    duplicateLine.textContent = 'Zeile duplizieren';
    duplicateLine.disabled = multiSelectMode;
    duplicateLine.addEventListener('click', () => {
      commit(() => {
        state.song.lines.splice(lineIndex + 1, 0, clone(line));
        selection = { line: lineIndex + 1, word: 0 };
      }, 'Liedzeile dupliziert');
    });
    controls.appendChild(duplicateLine);

    const copyNotes = document.createElement('button');
    copyNotes.type = 'button';
    copyNotes.className = 'mini-button';
    copyNotes.textContent = 'Noten ↓';
    copyNotes.disabled = multiSelectMode || lineIndex === state.song.lines.length - 1;
    copyNotes.setAttribute('aria-label', `Noten aus Zeile ${lineIndex + 1} in die nächste Textzeile kopieren`);
    copyNotes.addEventListener('click', () => {
      const targetLine = state.song.lines[lineIndex + 1];
      const sourceNotations = line.words.map(word => word.notation);
      commit(() => {
        targetLine.words.forEach((word, wordIndex) => {
          word.notation = sourceNotations[wordIndex] || '';
        });
        selection = {
          line: lineIndex + 1,
          word: Math.min(selection.word, targetLine.words.length - 1)
        };
      }, `Noten nach Position in Zeile ${lineIndex + 2} kopiert`);
    });
    controls.appendChild(copyNotes);

    const deleteLine = document.createElement('button');
    deleteLine.type = 'button';
    deleteLine.className = 'mini-button';
    deleteLine.textContent = 'Zeile löschen';
    deleteLine.disabled = multiSelectMode || state.song.lines.length === 1;
    deleteLine.addEventListener('click', () => {
      commit(() => {
        state.song.lines.splice(lineIndex, 1);
        selection.line = Math.min(lineIndex, state.song.lines.length - 1);
        selection.word = 0;
      }, 'Zeile gelöscht');
    });
    controls.appendChild(deleteLine);
    lineElement.appendChild(controls);

    const wordRow = document.createElement('div');
    wordRow.className = 'word-row';
    wordRow.dataset.lineIndex = String(lineIndex);
    wordRow.addEventListener('dragover', event => {
      if (!draggedWord) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      wordRow.classList.add('is-drop-target');
    });
    wordRow.addEventListener('dragleave', event => {
      if (!wordRow.contains(event.relatedTarget)) wordRow.classList.remove('is-drop-target');
    });
    wordRow.addEventListener('drop', event => {
      if (!draggedWord) return;
      event.preventDefault();
      const source = { ...draggedWord };
      draggedWord = null;
      clearDropIndicators();
      moveWordBlock(source, lineIndex, line.words.length);
    });

    line.words.forEach((word, wordIndex) => {
      const unit = document.createElement('button');
      unit.type = 'button';
      unit.className = 'word-unit';
      unit.draggable = false;
      unit.dataset.lineIndex = String(lineIndex);
      unit.dataset.wordIndex = String(wordIndex);
      unit.tabIndex = rovingCoordinate.line === lineIndex && rovingCoordinate.word === wordIndex ? 0 : -1;
      if (selection.line === lineIndex && selection.word === wordIndex) unit.classList.add('is-selected');
      const multiIndex = multiOrder.get(`${lineIndex}:${wordIndex}`);
      if (multiIndex) unit.classList.add('is-multi-selected');
      const accessibleWord = word.text === '♪' ? 'Melodie ohne Text' : (word.text || 'Leeres Wort');
      unit.setAttribute('aria-label', multiSelectMode
        ? `${accessibleWord}, ${multiIndex ? `markiert als ${multiIndex}` : 'nicht markiert'}`
        : `${accessibleWord} bearbeiten`);
      if (multiSelectMode) unit.setAttribute('aria-pressed', multiIndex ? 'true' : 'false');
      if (!multiSelectMode && selection.line === lineIndex && selection.word === wordIndex) {
        unit.setAttribute('aria-current', 'true');
      }
      unit.addEventListener('click', event => {
        if (suppressNextWordClick) {
          event.preventDefault();
          suppressNextWordClick = false;
          return;
        }
        if (event.shiftKey) {
          selectMultiRange(lineIndex, wordIndex);
          return;
        }
        if (event.ctrlKey || event.metaKey) {
          toggleIndividualMultiSelection(lineIndex, wordIndex);
          return;
        }
        if (multiSelectMode && multiSelectionInteraction === 'touch' && lastPointerType !== 'mouse') {
          toggleIndividualMultiSelection(lineIndex, wordIndex, 'touch');
          return;
        }
        if (multiSelectMode) clearMultiSelection();
        selection = { line: lineIndex, word: wordIndex };
        modeSelectionWord = null;
        renderAll();
        focusEditorAfterTouchSelection();
      });
      unit.addEventListener('pointerdown', event => {
        lastPointerType = event.pointerType || 'mouse';
        clearTimeout(longPressTimer);
        if (multiSelectMode || event.button !== 0 || pointerDrag) return;
        if (event.pointerType === 'touch' || event.pointerType === 'pen') {
          longPressTimer = setTimeout(() => startTouchMultiSelection(lineIndex, wordIndex), 550);
        }
        pointerDrag = {
          pointerId: event.pointerId,
          source: { line: lineIndex, word: wordIndex },
          startX: event.clientX,
          startY: event.clientY,
          active: false,
          target: null,
          ghost: null,
          unit
        };
        unit.setPointerCapture?.(event.pointerId);
      });
      unit.addEventListener('pointermove', event => {
        if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
        const distance = Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY);
        if (distance >= 7) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        if (!pointerDrag.active && distance >= 8) {
          pointerDrag.active = true;
          draggedWord = { ...pointerDrag.source };
          suppressNextWordClick = true;
          unit.classList.add('is-dragging');
          const ghost = document.createElement('div');
          ghost.className = 'drag-ghost';
          ghost.textContent = `${word.text || '(leer)'} | ${word.notation || 'keine Noten'}`;
          document.body.appendChild(ghost);
          pointerDrag.ghost = ghost;
        }
        if (!pointerDrag.active) return;
        event.preventDefault();
        pointerDrag.ghost.style.left = `${event.clientX}px`;
        pointerDrag.ghost.style.top = `${event.clientY}px`;
        updatePointerDropTarget(event.clientX, event.clientY);
      });
      unit.addEventListener('pointerup', event => {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
        const wasActive = pointerDrag.active;
        finishPointerDrag(false);
        if (wasActive) {
          event.preventDefault();
          setTimeout(() => { suppressNextWordClick = false; }, 0);
        }
      });
      unit.addEventListener('pointercancel', event => {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
        finishPointerDrag(true);
        suppressNextWordClick = false;
      });
      unit.addEventListener('contextmenu', event => {
        if (lastPointerType !== 'mouse') event.preventDefault();
      });
      unit.addEventListener('dragstart', event => {
        draggedWord = { line: lineIndex, word: wordIndex };
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', `${lineIndex}:${wordIndex}`);
        }
        requestAnimationFrame(() => unit.classList.add('is-dragging'));
      });
      unit.addEventListener('dragover', event => {
        if (!draggedWord) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
        document.querySelectorAll('.word-unit.drop-before, .word-unit.drop-after').forEach(element => {
          if (element !== unit) element.classList.remove('drop-before', 'drop-after');
        });
        const bounds = unit.getBoundingClientRect();
        const after = event.clientX >= bounds.left + bounds.width / 2;
        unit.classList.toggle('drop-before', !after);
        unit.classList.toggle('drop-after', after);
      });
      unit.addEventListener('dragleave', () => {
        unit.classList.remove('drop-before', 'drop-after');
      });
      unit.addEventListener('drop', event => {
        if (!draggedWord) return;
        event.preventDefault();
        event.stopPropagation();
        const bounds = unit.getBoundingClientRect();
        const after = event.clientX >= bounds.left + bounds.width / 2;
        const source = { ...draggedWord };
        draggedWord = null;
        clearDropIndicators();
        moveWordBlock(source, lineIndex, wordIndex + (after ? 1 : 0));
      });
      unit.addEventListener('dragend', () => {
        draggedWord = null;
        clearDropIndicators();
      });

      const notes = document.createElement('span');
      notes.className = 'notes';
      const parsed = parseNotation(word.notation);
      const playableCount = parsed.filter(event => event.type !== 'separator').length;
      const desiredToneCount = word.text === '♪' ? Math.max(0, Number(word.toneCount) || 0) : 0;
      if (parsed.length === 0 && desiredToneCount === 0) {
        const empty = document.createElement('span');
        empty.className = 'empty-notation';
        empty.textContent = 'Keine Noten';
        notes.appendChild(empty);
      } else {
        parsed.forEach(event => notes.appendChild(renderNoteEvent(event, keys)));
        for (let slot = playableCount; slot < desiredToneCount; slot += 1) {
          const placeholder = document.createElement('span');
          placeholder.className = 'note-placeholder';
          placeholder.textContent = String(slot + 1);
          placeholder.setAttribute('aria-label', `Leerer Melodieton ${slot + 1}`);
          notes.appendChild(placeholder);
        }
      }
      unit.appendChild(notes);

      const label = document.createElement('span');
      label.className = 'word-label';
      label.textContent = word.text || '(leer)';
      unit.appendChild(label);
      if (multiIndex) {
        const indexBadge = document.createElement('span');
        indexBadge.className = 'multi-selection-index';
        indexBadge.textContent = String(multiIndex);
        indexBadge.setAttribute('aria-hidden', 'true');
        unit.appendChild(indexBadge);
      }
      wordRow.appendChild(unit);
    });

    if (line.words.length === 0) {
      const emptyLine = document.createElement('span');
      emptyLine.className = 'empty-line-drop';
      emptyLine.textContent = 'Block hier ablegen oder ein Wort hinzufügen';
      wordRow.appendChild(emptyLine);
    }

    lineElement.appendChild(wordRow);
    elements.sheet.appendChild(lineElement);
  });
}

function renderEditor() {
  const word = selectedWord();
  if (modeSelectionWord !== word) {
    setInsertModeFromWord(word);
    modeSelectionWord = word;
  }
  elements.selectionHeading.textContent = multiSelectMode
    ? 'Mehrere Blöcke bearbeiten'
    : (word.text === '♪' ? 'Melodie bearbeiten' : `${word.text || '(leer)'} bearbeiten`);
  elements.selectionLabel.textContent = `Zeile ${selection.line + 1} · Wort ${selection.word + 1}`;
  elements.wordText.value = word.text;
  elements.wordNotation.value = word.notation;
  elements.wordText.disabled = multiSelectMode;
  elements.wordNotation.disabled = multiSelectMode;
  const isMelody = word.text === '♪';
  elements.melodyCountField.hidden = !isMelody;
  elements.melodyToneCount.value = String(Math.max(1, Number(word.toneCount) || parseNotation(word.notation).filter(event => event.type !== 'separator').length || 1));
  elements.melodyToneCount.disabled = multiSelectMode;
  elements.moveLeft.disabled = multiSelectMode || selection.word === 0;
  elements.moveRight.disabled = multiSelectMode || selection.word === state.song.lines[selection.line].words.length - 1;
  elements.addWord.disabled = multiSelectMode;
  elements.duplicateWord.disabled = multiSelectMode;
  elements.splitSyllables.disabled = multiSelectMode || word.text === '♪' || word.text.trim().length < 2;
  elements.instrumental.disabled = multiSelectMode;
  elements.deleteWord.disabled = multiSelectMode || state.song.lines[selection.line].words.length === 1;
  elements.addLine.disabled = multiSelectMode;
  renderMultiSelectionControls();
  renderNotesClipboard();
  renderPalette();
  renderChordControls();
}

function renderMultiSelectionControls() {
  const selected = orderedMultiSelection();
  const hasNotes = selected.some(target =>
    parseNotation(state.song.lines[target.line].words[target.word].notation).some(event => event.type !== 'separator')
  );
  elements.assignSequence.disabled = selected.length < 2;
  elements.multiSelectStatus.hidden = !multiSelectMode;
  elements.multiSelectStatus.textContent = selected.length === 1
    ? '1 Block markiert – wähle mindestens einen weiteren Block im Lied aus.'
    : `${selected.length} Blöcke markiert – die Nummern zeigen die Reihenfolge im Lied.`;
  elements.selectionToolbar.hidden = !multiSelectMode || selected.length === 0;
  const selectedLines = new Set(selected.map(target => target.line));
  elements.selectionToolbarStatus.textContent = `${selected.length} ${selected.length === 1 ? 'Block' : 'Blöcke'} · ${selectedLines.size} ${selectedLines.size === 1 ? 'Zeile' : 'Zeilen'}`;
  elements.selectionToolbarDetail.textContent = selected.length
    ? `Liedreihenfolge: ${selected.map(target => `Z${target.line + 1}/W${target.word + 1}`).join(' → ')}`
    : '';
  const focusedLine = multiSelectionFocus?.line ?? selection.line;
  elements.toolbarLine.textContent = `Ganze Zeile ${focusedLine + 1} markieren`;
  elements.toolbarLine.disabled = !state.song.lines[focusedLine]?.words.length;
  elements.toolbarSequence.disabled = selected.length < 2;
  elements.toolbarCopy.disabled = !hasNotes;
  elements.toolbarPaste.disabled = !copiedNotation;
  elements.toolbarRemoveLast.disabled = !hasNotes;
  elements.toolbarClear.disabled = !hasNotes;
  document.body.classList.toggle('has-selection-toolbar', multiSelectMode && selected.length > 0);
  requestAnimationFrame(() => {
    const height = elements.selectionToolbar.hidden ? 0 : elements.selectionToolbar.offsetHeight;
    document.documentElement.style.setProperty('--selection-toolbar-height', `${height}px`);
  });
}

function renderNotesClipboard() {
  const currentEvents = parseNotation(selectedWord().notation);
  elements.copyNotes.disabled = multiSelectMode || !currentEvents.some(event => event.type !== 'separator');
  elements.pasteNotes.disabled = multiSelectMode || !copiedNotation;
  elements.notesClipboardStatus.hidden = multiSelectMode;
  elements.notesClipboardStatus.textContent = copiedNotation
    ? `Kopiert von „${copiedNotation.source}“: ${copiedNotation.notation}`
    : 'Noch keine Noten kopiert.';
}

function updateMelodyToneCount(word) {
  if (word.text !== '♪') return;
  word.toneCount = Math.max(1, parseNotation(word.notation).filter(event => event.type !== 'separator').length);
}

function copySelectedNotes() {
  const selected = orderedMultiSelection();
  const notation = selected
    .map(target => state.song.lines[target.line].words[target.word].notation.trim())
    .filter(Boolean)
    .join(' ');
  if (!notation) return;
  copiedNotation = {
    notation,
    source: `${selected.length} markierten Blöcken`
  };
  renderNotesClipboard();
  renderMultiSelectionControls();
  showToast(`Noten aus ${selected.length} Blöcken kopiert`);
}

function pasteNotesIntoSelection() {
  if (!copiedNotation) return;
  const selected = orderedMultiSelection();
  const pastedNotation = copiedNotation.notation;
  modeSelectionWord = null;
  commit(() => {
    selected.forEach(target => {
      const word = state.song.lines[target.line].words[target.word];
      const current = word.notation.trim();
      word.notation = normalizeNotation(current ? `${current} ${pastedNotation}` : pastedNotation);
      updateMelodyToneCount(word);
    });
  }, `Kopierte Noten in ${selected.length} Blöcke eingefügt`);
}

function removeLastPlayableEvent(notation) {
  const events = parseNotation(notation);
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].type === 'separator') continue;
    events.splice(index, 1);
    break;
  }
  return serializeNotationEvents(events);
}

function removeLastEventFromSelection() {
  const selected = orderedMultiSelection();
  modeSelectionWord = null;
  commit(() => {
    selected.forEach(target => {
      const word = state.song.lines[target.line].words[target.word];
      word.notation = removeLastPlayableEvent(word.notation);
      updateMelodyToneCount(word);
    });
  }, `Letztes Tonereignis aus ${selected.length} Blöcken entfernt`);
}

function clearSelectedNotes() {
  const selected = orderedMultiSelection();
  modeSelectionWord = null;
  commit(() => {
    selected.forEach(target => {
      const word = state.song.lines[target.line].words[target.word];
      word.notation = '';
      updateMelodyToneCount(word);
    });
  }, `Noten aus ${selected.length} Blöcken geleert`);
}

function renderPalette() {
  const paletteFocusToken = document.activeElement?.closest?.('.key-button')?.dataset.keyValue
    ? { type: 'key', value: document.activeElement.closest('.key-button').dataset.keyValue }
    : null;
  elements.palette.replaceChildren();
  const notationEvents = parseNotation(selectedWord().notation);
  const usedValues = new Set(notationEvents.flatMap(event => {
    if (event.type === 'chord') return event.values;
    if (event.type === 'note') return [event.value];
    return [];
  }));
  const keysByValue = keyMap();
  const eventLabels = notationEvents
    .filter(event => event.type !== 'separator')
    .map(event => {
      const values = event.type === 'chord' ? event.values : [event.value];
      const labels = values.map(value => {
        const key = keysByValue.get(value);
        return key ? `${key.letter} ${value}` : value;
      });
      return event.type === 'chord' ? `gemeinsam: ${labels.join(' + ')}` : labels[0];
    });
  elements.existingNotesStatus.textContent = eventLabels.length
    ? `Im ausgewählten Block: ${eventLabels.join(' · ')}`
    : 'Im ausgewählten Block: keine Noten';
  state.keys.forEach((key, index) => {
    const button = document.createElement('button');
    const isUsed = usedValues.has(key.value);
    const isInDraft = chordDraft.includes(key.value);
    const distanceFromCenter = Math.abs(8 - index);
    button.type = 'button';
    button.className = 'key-button';
    button.disabled = multiSelectMode;
    button.dataset.keyValue = key.value;
    button.style.setProperty('--key-color', key.color);
    button.style.setProperty('--tine-height', `${7.4 - distanceFromCenter * .32}rem`);
    if (isUsed) button.classList.add('is-used-note');
    if (isInDraft) button.classList.add('is-in-chord');
    button.setAttribute('aria-pressed', isInDraft ? 'true' : 'false');
    const states = [
      isUsed ? 'im Block vorhanden' : '',
      isInDraft ? 'für neuen Akkord ausgewählt' : ''
    ].filter(Boolean);
    button.setAttribute('aria-label', `${key.letter} ${key.value}, ${key.hand === 'R' ? 'rechte' : 'linke'} Hand${states.length ? `, ${states.join(', ')}` : ''}`);
    if (isUsed && !isInDraft) button.title = 'Aus dem ausgewählten Block entfernen';
    button.innerHTML = `<span class="key-hand" aria-hidden="true">${key.hand}</span><span class="key-letter">${key.letter}</span><span class="key-number">${key.value}</span><span class="key-state-indicators" aria-hidden="true">${isUsed ? '<span class="key-used-marker">vorhanden</span>' : ''}${isInDraft ? '<span class="key-draft-marker">Akkord</span>' : ''}</span>`;
    button.addEventListener('click', () => handleKeyClick(key.value));
    elements.palette.appendChild(button);
  });
  if (paletteFocusToken) restoreFocusToken(paletteFocusToken);
}

function renderChordControls() {
  elements.chordControls.hidden = insertMode !== 'chord';
  elements.chordDraft.textContent = chordDraft.length
    ? `Neuer Akkord: ${chordDraft.join(' + ')}`
    : 'Für einen neuen Akkord noch keine Töne ausgewählt';
  elements.insertChord.disabled = multiSelectMode || chordDraft.length < 2;
  elements.clearChord.disabled = multiSelectMode;
  elements.insertSeparator.disabled = multiSelectMode;
  elements.clearNotation.disabled = multiSelectMode;
}

function renderKeySettings() {
  elements.keySettings.replaceChildren();
  state.keys.forEach((key, index) => {
    const row = document.createElement('div');
    row.className = 'key-setting-row';

    const name = document.createElement('span');
    name.className = 'key-setting-name';
    name.textContent = `${index + 1}. ${key.letter} / ${key.value}`;
    row.appendChild(name);

    const color = document.createElement('input');
    color.type = 'color';
    color.className = 'color-input';
    color.value = key.color;
    color.setAttribute('aria-label', `Farbe für ${key.letter} ${key.value}`);
    color.addEventListener('change', event => {
      commit(() => { key.color = event.target.value; }, `Farbe von ${key.letter} ${key.value} geändert`);
    });
    row.appendChild(color);

    const handLabel = document.createElement('label');
    handLabel.className = 'hand-check';
    const hand = document.createElement('input');
    hand.type = 'checkbox';
    hand.checked = key.hand === 'R';
    hand.addEventListener('change', event => {
      commit(() => { key.hand = event.target.checked ? 'R' : 'L'; }, `Hand für ${key.letter} ${key.value} geändert`);
    });
    handLabel.append(hand, document.createTextNode('rechts'));
    row.appendChild(handLabel);
    elements.keySettings.appendChild(row);
  });
}

function renderAll(preferredFocusToken = null) {
  const focusToken = captureFocusToken();
  normalizeSelection();
  elements.songTitle.value = state.song.title;
  elements.printTitle.textContent = state.song.title;
  renderSheet();
  renderEditor();
  renderKeySettings();
  updateUndoButton();
  restoreFocusToken(preferredFocusToken || focusToken);
  requestAnimationFrame(() => {
    const editorCore = document.querySelector('.editor-core');
    document.documentElement.style.setProperty('--editor-core-height', `${editorCore?.offsetHeight || 0}px`);
  });
}

function updateUndoButton() {
  elements.undo.disabled = history.length === 0;
}

function appendNotationToken(token) {
  const word = selectedWord();
  const current = word.notation.trim();
  word.notation = current ? `${current} ${token}` : token;
}

function handleKeyClick(value) {
  const word = selectedWord();
  const isUsed = parseNotation(word.notation).some(event =>
    (event.type === 'note' && event.value === value) ||
    (event.type === 'chord' && event.values.includes(value))
  );

  if (isUsed && chordDraft.length === 0) {
    modeSelectionWord = null;
    commit(() => {
      word.notation = removeLastPitchOccurrence(word.notation, value);
      if (word.text === '♪') {
        word.toneCount = Math.max(1, parseNotation(word.notation).filter(event => event.type !== 'separator').length);
      }
    }, `${value} entfernt`);
    return;
  }

  if (insertMode === 'single') {
    commit(() => appendNotationToken(value), `${value} eingefügt`);
    return;
  }

  if (chordDraft.includes(value)) {
    chordDraft = chordDraft.filter(item => item !== value);
  } else {
    chordDraft.push(value);
  }
  renderPalette();
  renderChordControls();
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => { elements.toast.hidden = true; }, 2200);
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'kalimba-lied';
}

elements.songTitle.addEventListener('focus', beginFieldEdit);
elements.songTitle.addEventListener('input', event => {
  captureFieldHistory();
  state.song.title = event.target.value;
  elements.printTitle.textContent = state.song.title;
  persist();
});
elements.songTitle.addEventListener('change', finishFieldEdit);

elements.wordText.addEventListener('focus', beginFieldEdit);
elements.wordText.addEventListener('input', event => {
  captureFieldHistory();
  selectedWord().text = event.target.value;
  const isMelody = selectedWord().text === '♪';
  elements.melodyCountField.hidden = !isMelody;
  if (isMelody && !selectedWord().toneCount) {
    selectedWord().toneCount = Math.max(1, parseNotation(selectedWord().notation).filter(item => item.type !== 'separator').length);
    elements.melodyToneCount.value = String(selectedWord().toneCount);
  }
  persist();
  renderSheet();
});
elements.wordText.addEventListener('change', finishFieldEdit);

elements.wordNotation.addEventListener('focus', beginFieldEdit);
elements.wordNotation.addEventListener('input', event => {
  captureFieldHistory();
  selectedWord().notation = normalizeNotation(event.target.value);
  persist();
  renderSheet();
});
elements.wordNotation.addEventListener('change', finishFieldEdit);

elements.melodyToneCount.addEventListener('change', event => {
  const count = Math.max(1, Math.min(64, Number.parseInt(event.target.value, 10) || 1));
  commit(() => { selectedWord().toneCount = count; }, `Melodie auf ${count} Töne eingestellt`);
});

elements.moveLeft.addEventListener('click', () => {
  if (selection.word === 0) return;
  commit(() => {
    const words = state.song.lines[selection.line].words;
    [words[selection.word - 1], words[selection.word]] = [words[selection.word], words[selection.word - 1]];
    selection.word -= 1;
  }, 'Wort nach links verschoben');
});

elements.moveRight.addEventListener('click', () => {
  const words = state.song.lines[selection.line].words;
  if (selection.word >= words.length - 1) return;
  commit(() => {
    [words[selection.word], words[selection.word + 1]] = [words[selection.word + 1], words[selection.word]];
    selection.word += 1;
  }, 'Wort nach rechts verschoben');
});

elements.addWord.addEventListener('click', () => {
  commit(() => {
    const words = state.song.lines[selection.line].words;
    words.splice(selection.word + 1, 0, { text: 'Neues Wort', notation: '' });
    selection.word += 1;
  }, 'Wort hinzugefügt');
});

elements.duplicateWord.addEventListener('click', () => {
  commit(() => {
    const words = state.song.lines[selection.line].words;
    words.splice(selection.word + 1, 0, clone(selectedWord()));
    selection.word += 1;
  }, 'Wort und Noten dupliziert');
});

elements.assignSequence.addEventListener('click', openSequenceDialog);
elements.toolbarLine.addEventListener('click', selectFocusedLine);
elements.toolbarSequence.addEventListener('click', openSequenceDialog);
elements.toolbarCopy.addEventListener('click', copySelectedNotes);
elements.toolbarPaste.addEventListener('click', pasteNotesIntoSelection);
elements.toolbarRemoveLast.addEventListener('click', removeLastEventFromSelection);
elements.toolbarClear.addEventListener('click', clearSelectedNotes);
elements.toolbarCancel.addEventListener('click', () => {
  clearMultiSelection();
  renderAll();
  showToast('Mehrfachauswahl aufgehoben');
});

elements.copyNotes.addEventListener('click', () => {
  const word = selectedWord();
  if (!parseNotation(word.notation).some(event => event.type !== 'separator')) return;
  copiedNotation = {
    notation: word.notation.trim(),
    source: word.text === '♪' ? 'Melodie' : (word.text || 'leerer Block')
  };
  renderNotesClipboard();
  showToast(`Noten von „${copiedNotation.source}“ kopiert`);
});

elements.pasteNotes.addEventListener('click', () => {
  if (!copiedNotation) return;
  const pastedNotation = copiedNotation.notation;
  modeSelectionWord = null;
  commit(() => {
    const word = selectedWord();
    const current = word.notation.trim();
    word.notation = normalizeNotation(current ? `${current} ${pastedNotation}` : pastedNotation);
    if (word.text === '♪') {
      word.toneCount = Math.max(1, parseNotation(word.notation).filter(event => event.type !== 'separator').length);
    }
  }, 'Noten und Akkorde eingefügt');
});

elements.splitSyllables.addEventListener('click', () => {
  const word = selectedWord();
  if (word.text === '♪' || word.text.trim().length < 2) return;
  pendingSyllableSelection = { ...selection };
  pendingSyllableOriginal = word.text.replace(/\s+-\s*$/, '').trim();
  pendingSyllableSuggestion = suggestGermanSyllables(pendingSyllableOriginal);
  document.querySelector('input[name="syllable-mode"][value="auto"]').checked = true;
  elements.syllableInput.value = pendingSyllableSuggestion;
  elements.syllableSuggestionStatus.textContent = pendingSyllableSuggestion.includes('-')
    ? 'Automatisch erkannt – bitte den Vorschlag prüfen und bei Bedarf korrigieren.'
    : 'Keine sichere Trennung erkannt – bitte die Bindestriche manuell ergänzen.';
  elements.distributeNotes.checked = true;
  elements.syllableDialog.showModal();
  elements.syllableInput.focus();
  elements.syllableInput.setSelectionRange(0, elements.syllableInput.value.length);
});

document.querySelectorAll('input[name="syllable-mode"]').forEach(input => {
  input.addEventListener('change', event => {
    const automatic = event.target.value === 'auto';
    elements.syllableInput.value = automatic ? pendingSyllableSuggestion : pendingSyllableOriginal;
    elements.syllableSuggestionStatus.textContent = automatic
      ? (pendingSyllableSuggestion.includes('-')
          ? 'Automatisch erkannt – bitte den Vorschlag prüfen und bei Bedarf korrigieren.'
          : 'Keine sichere Trennung erkannt – bitte die Bindestriche manuell ergänzen.')
      : 'Manueller Modus – setze die Trennstellen selbst mit Bindestrichen.';
    elements.syllableInput.focus();
  });
});

elements.instrumental.addEventListener('click', () => {
  if (selectedWord().text === '♪') return;
  commit(() => {
    const word = selectedWord();
    word.text = '♪';
    word.toneCount = Math.max(1, parseNotation(word.notation).filter(item => item.type !== 'separator').length);
  }, 'Als Melodie ohne Text markiert');
});

elements.deleteWord.addEventListener('click', () => {
  const words = state.song.lines[selection.line].words;
  if (words.length === 1) return;
  commit(() => {
    words.splice(selection.word, 1);
    selection.word = Math.min(selection.word, words.length - 1);
  }, 'Wort gelöscht');
});

document.querySelectorAll('input[name="insert-mode"]').forEach(input => {
  input.addEventListener('change', event => {
    insertMode = event.target.value;
    chordDraft = [];
    renderPalette();
    renderChordControls();
  });
});

elements.insertChord.addEventListener('click', () => {
  if (chordDraft.length < 2) return;
  const chord = `(${chordDraft.join('')})`;
  commit(() => appendNotationToken(chord), 'Gemeinsame Noten eingefügt');
  chordDraft = [];
  renderPalette();
  renderChordControls();
});

elements.clearChord.addEventListener('click', () => {
  chordDraft = [];
  renderPalette();
  renderChordControls();
});

elements.insertSeparator.addEventListener('click', () => {
  commit(() => appendNotationToken('-'), 'Trenner eingefügt');
});

elements.clearNotation.addEventListener('click', () => {
  commit(() => { selectedWord().notation = ''; }, 'Notation geleert');
});

elements.addLine.addEventListener('click', () => {
  commit(() => {
    state.song.lines.push({ words: [{ text: 'Neue Zeile', notation: '' }] });
    selection = { line: state.song.lines.length - 1, word: 0 };
  }, 'Liedzeile hinzugefügt');
});

elements.melodyForm.addEventListener('submit', event => {
  event.preventDefault();
  if (pendingMelodyLine === null) return;
  const count = Math.max(1, Math.min(64, Number.parseInt(elements.newMelodyToneCount.value, 10) || 1));
  const lineIndex = pendingMelodyLine;
  pendingMelodyLine = null;
  elements.melodyDialog.close();
  commit(() => {
    const words = state.song.lines[lineIndex].words;
    words.push({ text: '♪', notation: '', toneCount: count });
    selection = { line: lineIndex, word: words.length - 1 };
  }, `Melodie mit ${count} Tönen hinzugefügt`);
});

elements.cancelMelody.addEventListener('click', () => {
  pendingMelodyLine = null;
  elements.melodyDialog.close();
});

elements.syllableForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!pendingSyllableSelection) return;
  const syllables = elements.syllableInput.value
    .split('-')
    .map(value => value.trim())
    .filter(Boolean);
  if (syllables.length < 2) {
    showToast('Bitte mindestens eine Trennstelle mit einem Bindestrich angeben');
    return;
  }

  const sourceSelection = pendingSyllableSelection;
  const sourceWord = state.song.lines[sourceSelection.line]?.words[sourceSelection.word];
  if (!sourceWord) {
    pendingSyllableSelection = null;
    elements.syllableDialog.close();
    return;
  }

  const distributed = elements.distributeNotes.checked
    ? distributeNotationAcrossSyllables(sourceWord.notation, syllables.length)
    : [sourceWord.notation, ...Array(syllables.length - 1).fill('')];
  const replacements = syllables.map((syllable, index) => ({
    text: index < syllables.length - 1 ? `${syllable} -` : syllable,
    notation: distributed[index] || ''
  }));

  pendingSyllableSelection = null;
  pendingSyllableOriginal = '';
  pendingSyllableSuggestion = '';
  elements.syllableDialog.close();
  commit(() => {
    const words = state.song.lines[sourceSelection.line].words;
    words.splice(sourceSelection.word, 1, ...replacements);
    selection = { line: sourceSelection.line, word: sourceSelection.word };
  }, `Wort in ${syllables.length} Silben geteilt`);
});

elements.cancelSyllable.addEventListener('click', () => {
  pendingSyllableSelection = null;
  pendingSyllableOriginal = '';
  pendingSyllableSuggestion = '';
  elements.syllableDialog.close();
});

elements.sequenceNotation.addEventListener('input', () => {
  elements.sequenceNotation.setCustomValidity('');
  updateSequencePreview();
});

document.querySelectorAll('input[name="sequence-distribution"], input[name="sequence-merge"]').forEach(input => {
  input.addEventListener('change', updateSequencePreview);
});

elements.sequenceForm.addEventListener('submit', event => {
  event.preventDefault();
  const targets = orderedMultiSelection();
  if (targets.length < 2) {
    elements.sequenceDialog.close();
    return;
  }

  const notation = normalizeNotation(elements.sequenceNotation.value.trim());
  const distribution = document.querySelector('input[name="sequence-distribution"]:checked').value;
  const mergeMode = document.querySelector('input[name="sequence-merge"]:checked').value;
  const result = buildSequenceAssignments(notation, targets, distribution);

  if (result.error) {
    elements.sequenceNotation.setCustomValidity(result.error);
    elements.sequenceNotation.reportValidity();
    return;
  }
  const firstTarget = { ...targets[0] };

  elements.sequenceDialog.close();
  modeSelectionWord = null;
  commit(() => {
    targets.forEach((target, index) => {
      const word = state.song.lines[target.line].words[target.word];
      word.notation = mergeAssignedNotation(word.notation, result.assignments[index], mergeMode);
      updateMelodyToneCount(word);
    });
    selection = firstTarget;
  }, `Tonfolge auf ${targets.length} Blöcke verteilt`);
});

elements.cancelSequence.addEventListener('click', () => {
  elements.sequenceNotation.setCustomValidity('');
  elements.sequenceDialog.close();
});

document.addEventListener('keydown', event => {
  const target = event.target;
  const isEditing = target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable;
  if (document.querySelector('dialog[open]')) return;

  if (event.key === 'Escape' && (multiSelectMode || isEditing)) {
    event.preventDefault();
    if (multiSelectMode) {
      const focusCoordinate = multiSelectionFocus || selection;
      selection = { ...focusCoordinate };
      clearMultiSelection();
      renderAll({ type: 'word', ...selection });
      showToast('Mehrfachauswahl aufgehoben');
    } else {
      wordButtonAt(selection)?.focus();
    }
    return;
  }

  if (isEditing) return;

  if (event.shiftKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
    extendSelectionWithArrow(event.key);
    return;
  }
  const fromWordBlock = target?.closest?.('.word-unit');
  if (!multiSelectMode && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey &&
      ['ArrowLeft', 'ArrowRight'].includes(event.key) && (fromWordBlock || target === document.body)) {
    event.preventDefault();
    const coordinates = allWordCoordinates();
    const currentIndex = coordinates.findIndex(item => item.line === selection.line && item.word === selection.word);
    const offset = event.key === 'ArrowLeft' ? -1 : 1;
    const next = coordinates[Math.max(0, Math.min(coordinates.length - 1, currentIndex + offset))];
    if (next) {
      selection = { ...next };
      modeSelectionWord = null;
      renderAll({ type: 'word', ...next });
    }
    return;
  }

  if (event.key === 'Enter' && (fromWordBlock || target === document.body)) {
    event.preventDefault();
    if (multiSelectMode) {
      if (orderedMultiSelection().length >= 2) openSequenceDialog();
    } else {
      elements.wordText.focus();
      elements.wordText.select();
    }
    return;
  }

  if (!multiSelectMode) return;
  const commandKey = event.ctrlKey || event.metaKey;
  if (commandKey && event.key.toLowerCase() === 'c') {
    event.preventDefault();
    copySelectedNotes();
    return;
  }
  if (commandKey && event.key.toLowerCase() === 'v') {
    event.preventDefault();
    pasteNotesIntoSelection();
    return;
  }
  if (event.key === 'Delete') {
    event.preventDefault();
    clearSelectedNotes();
  }
});

elements.undo.addEventListener('click', undo);
elements.print.addEventListener('click', () => window.print());

elements.export.addEventListener('click', () => {
  const payload = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(payload);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(state.song.title)}.kalimba.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Sicherung exportiert');
});

elements.import.addEventListener('click', () => elements.importFile.click());
elements.importFile.addEventListener('change', event => {
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      const imported = JSON.parse(reader.result);
      validateState(imported);
      history.push(snapshot());
      state = imported;
      selection = { line: 0, word: 0 };
      chordDraft = [];
      clearMultiSelection();
      persist();
      renderAll();
      showToast('Sicherung importiert');
    } catch (error) {
      showToast(`Import fehlgeschlagen: ${error.message}`);
    }
  });
  reader.readAsText(file);
});

elements.reset.addEventListener('click', () => {
  if (!window.confirm('Alle aktuellen Änderungen verwerfen und das Beispiel wiederherstellen?')) return;
  commit(() => {
    state = clone(DEFAULT_STATE);
    selection = { line: 0, word: 0 };
    chordDraft = [];
    clearMultiSelection();
  }, 'Beispiel wiederhergestellt');
});

persist();
renderAll();
