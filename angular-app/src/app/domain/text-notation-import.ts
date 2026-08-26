import { cloneJson } from './json-value';
import { MusicEvent, Pitch } from './music-event';
import { createTrackedWordFields, SongDocument, SongLine } from './song-document';
import { DEFAULT_DOCUMENT } from './default-document';

export interface TextNotationImportWarning {
  lineNumber: number;
  message: string;
  source: string;
  blocking: boolean;
}

export interface TextNotationPreviewLine {
  sourceLineNumber: number;
  section: string;
  rowNumber?: number;
  text: string;
  notation: string;
  normalizedNotation: string;
  eventCount: number;
  noteCount: number;
  chordCount: number;
  barlineCount: number;
  repeatedFromRow?: number;
}

export interface TextNotationImportPreview {
  title: string;
  lines: TextNotationPreviewLine[];
  warnings: TextNotationImportWarning[];
  noteCount: number;
  chordCount: number;
  barlineCount: number;
  canImport: boolean;
  source: string;
}

interface ParsedNotation {
  normalized: string;
  legacy: string;
  events: MusicEvent[];
}

interface SectionRow {
  rowNumber: number;
  preview: TextNotationPreviewLine;
}

const NOTE_PATTERN = /^[1-7](?:°{1,2})?$/u;
const CHORD_PATTERN = /^\(([1-7](?:°{1,2})?)(?:\+[1-7](?:°{1,2})?)+\)$/u;
const SECTION_PATTERN =
  /^(?:Intro|Schluss|Outro|Refrain|Strophe(?:\s+\d+)?|Teil\s+[A-ZÄÖÜ0-9]+|Abschnitt\s+.+)$/iu;
const NUMBERED_SECTION_PATTERN = /^\d+\s*[.):]\s*(?:[\p{L}][\p{L}\d -]*)?$/u;
const NUMBERED_NOTATION_PATTERN = /^(\d+)\s*[.):]\s+(.+)$/u;
const REPEAT_PATTERN = /^Zeilen?\s+(\d+(?:\s*(?:→|->)\s*\d+)+)\s*$/iu;

export function inspectTextNotation(source: string): TextNotationImportPreview {
  const physicalLines = source
    .replace(/^\uFEFF/u, '')
    .replace(/\r\n?/gu, '\n')
    .split('\n');
  const firstContentIndex = physicalLines.findIndex((line) => line.trim().length > 0);
  const warnings: TextNotationImportWarning[] = [];
  if (firstContentIndex < 0) {
    warnings.push({
      lineNumber: 1,
      message: 'Bitte einen Titel und mindestens eine Notationszeile eingeben.',
      source: '',
      blocking: true,
    });
    return emptyPreview(source, warnings);
  }

  const title = physicalLines[firstContentIndex].trim();
  if (parseNotation(title)) {
    warnings.push({
      lineNumber: firstContentIndex + 1,
      message: 'Die erste freie Textzeile wird als Titel erwartet.',
      source: physicalLines[firstContentIndex],
      blocking: true,
    });
  }

  const previewLines: TextNotationPreviewLine[] = [];
  let section = 'Ohne Abschnitt';
  let pendingText: { text: string; lineNumber: number } | null = null;
  let implicitRowNumber = 0;
  const sectionRows = new Map<string, Map<number, SectionRow>>();

  const pushNotation = (
    notation: ParsedNotation,
    sourceLineNumber: number,
    rowNumber?: number,
    repeatedFromRow?: number,
  ): void => {
    const counts = countEvents(notation.events);
    const resolvedRow = rowNumber ?? ++implicitRowNumber;
    implicitRowNumber = Math.max(implicitRowNumber, resolvedRow);
    const preview: TextNotationPreviewLine = {
      sourceLineNumber,
      section,
      rowNumber: resolvedRow,
      text: pendingText?.text ?? '',
      notation: notation.legacy,
      normalizedNotation: notation.normalized,
      eventCount: counts.noteCount + counts.chordCount,
      ...counts,
      ...(repeatedFromRow === undefined ? {} : { repeatedFromRow }),
    };
    pendingText = null;
    previewLines.push(preview);
    const rows = sectionRows.get(section) ?? new Map<number, SectionRow>();
    if (!sectionRows.has(section)) sectionRows.set(section, rows);
    if (rowNumber !== undefined && !rows.has(rowNumber))
      rows.set(rowNumber, { rowNumber, preview });
  };

  for (let index = firstContentIndex + 1; index < physicalLines.length; index += 1) {
    const raw = physicalLines[index];
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lineNumber = index + 1;

    if (SECTION_PATTERN.test(trimmed) || NUMBERED_SECTION_PATTERN.test(trimmed)) {
      flushPendingText(pendingText, warnings);
      pendingText = null;
      section = trimmed;
      implicitRowNumber = 0;
      continue;
    }

    const repeat = REPEAT_PATTERN.exec(trimmed);
    if (repeat) {
      flushPendingText(pendingText, warnings);
      pendingText = null;
      const references = repeat[1].split(/\s*(?:→|->)\s*/u).map(Number);
      const rows = sectionRows.get(section);
      const ambiguous = references.filter((reference) => !rows?.has(reference));
      if (ambiguous.length) {
        warnings.push({
          lineNumber,
          message: `Die Zeilenreferenz ist im aktuellen Abschnitt nicht eindeutig (${ambiguous.join(', ')} fehlt).`,
          source: raw,
          blocking: true,
        });
        continue;
      }
      for (const reference of references) {
        const original = rows!.get(reference)!.preview;
        const parsed = parseNotation(original.normalizedNotation)!;
        pushNotation(parsed, lineNumber, undefined, reference);
      }
      continue;
    }

    const numbered = NUMBERED_NOTATION_PATTERN.exec(trimmed);
    const notationSource = numbered?.[2] ?? trimmed;
    const parsed = parseNotation(notationSource);
    if (parsed) {
      pushNotation(parsed, lineNumber, numbered ? Number(numbered[1]) : undefined);
      continue;
    }

    const nextContent = nextNonEmptyLine(physicalLines, index + 1);
    const nextNumbered = nextContent
      ? NUMBERED_NOTATION_PATTERN.exec(nextContent.text.trim())
      : null;
    if (
      !pendingText &&
      nextContent &&
      parseNotation(nextNumbered?.[2] ?? nextContent.text.trim())
    ) {
      pendingText = { text: trimmed, lineNumber };
      continue;
    }

    flushPendingText(pendingText, warnings);
    pendingText = null;
    warnings.push({
      lineNumber,
      message:
        'Unbekannter oder mehrdeutiger Bestandteil. Bitte entfernen oder in unterstützte Notation ändern.',
      source: raw,
      blocking: true,
    });
  }
  flushPendingText(pendingText, warnings);

  if (!previewLines.length) {
    warnings.push({
      lineNumber: firstContentIndex + 1,
      message: 'Es wurde keine unterstützte Notationszeile erkannt.',
      source: title,
      blocking: true,
    });
  } else {
    warnings.unshift({
      lineNumber: 0,
      message:
        'Standardannahme: 1 Schlag je geschriebenem Einzelton oder Akkord; es wird keine weitere Rhythmik ergänzt.',
      source: '',
      blocking: false,
    });
  }

  const totals = previewLines.reduce(
    (sum, line) => ({
      noteCount: sum.noteCount + line.noteCount,
      chordCount: sum.chordCount + line.chordCount,
      barlineCount: sum.barlineCount + line.barlineCount,
    }),
    { noteCount: 0, chordCount: 0, barlineCount: 0 },
  );
  return {
    title,
    lines: previewLines,
    warnings,
    ...totals,
    canImport: previewLines.length > 0 && !warnings.some((warning) => warning.blocking),
    source,
  };
}

export function createDocumentFromTextNotation(preview: TextNotationImportPreview): SongDocument {
  if (!preview.canImport) throw new Error('Die Textnotation enthält noch ungelöste Hinweise.');
  const lines: SongLine[] = preview.lines.map((line) => {
    const tracked = createTrackedWordFields(line.notation);
    return {
      words: [
        {
          text: line.text,
          ...tracked,
          toneCount: line.eventCount,
          extra: {
            structure: {
              section: line.section,
              ...(line.rowNumber === undefined ? {} : { number: line.rowNumber }),
              ...(line.repeatedFromRow === undefined
                ? {}
                : { repeatedFromRow: line.repeatedFromRow }),
            },
            textNotationImport: { sourceLineNumber: line.sourceLineNumber },
          },
        },
      ],
      extra: {},
    };
  });
  return {
    song: {
      title: preview.title,
      lines,
      extra: {
        textNotationImport: {
          rhythmAssumption: 'one-beat-per-written-event',
          source: preview.source,
        },
      },
    },
    keys: DEFAULT_DOCUMENT.keys.map((key) => cloneJson(key)),
    extra: {},
  };
}

function parseNotation(raw: string): ParsedNotation | null {
  const tokens = raw.match(/\([^)]*\)|\||\S+/gu) ?? [];
  if (!tokens.length || tokens.join(' ') !== raw.trim().replace(/\s+/gu, ' ')) return null;
  const legacyTokens: string[] = [];
  const normalizedTokens: string[] = [];
  const events: MusicEvent[] = [];
  for (const token of tokens) {
    if (token === '|') {
      normalizedTokens.push('|');
      legacyTokens.push('-');
      events.push({ kind: 'separator' });
      continue;
    }
    if (NOTE_PATTERN.test(token)) {
      const pitch = parsePitch(token);
      if (!pitch) return null;
      normalizedTokens.push(token);
      legacyTokens.push(legacyPitch(pitch));
      events.push({ kind: 'note', pitch, duration: 1 });
      continue;
    }
    if (CHORD_PATTERN.test(token)) {
      const parsedPitches = token
        .slice(1, -1)
        .split('+')
        .map((value) => parsePitch(value));
      if (parsedPitches.some((pitch) => pitch === null)) return null;
      const pitches = parsedPitches as Pitch[];
      normalizedTokens.push(`(${pitches.map(sourcePitch).join('+')})`);
      legacyTokens.push(`(${pitches.map(legacyPitch).join('')})`);
      events.push({ kind: 'chord', pitches, duration: 1 });
      continue;
    }
    return null;
  }
  if (!events.some((event) => event.kind !== 'separator')) return null;
  return { normalized: normalizedTokens.join(' '), legacy: legacyTokens.join(' '), events };
}

function parsePitch(raw: string): Pitch | null {
  const match = /^([1-7])(°{1,2})?$/u.exec(raw);
  if (!match) return null;
  const degree = Number(match[1]) as Pitch['degree'];
  const octave = (match[2]?.length ?? 0) as Pitch['octave'];
  // The active 17-key C-major profile only contains the second octave for degrees 1–3.
  if (octave === 2 && degree > 3) return null;
  return { degree, octave };
}

function legacyPitch(pitch: Pitch): string {
  return `${pitch.degree}${pitch.octave === 0 ? '' : pitch.octave === 1 ? '′' : '″'}`;
}

function sourcePitch(pitch: Pitch): string {
  return `${pitch.degree}${'°'.repeat(pitch.octave)}`;
}

function countEvents(events: readonly MusicEvent[]): {
  noteCount: number;
  chordCount: number;
  barlineCount: number;
} {
  return {
    noteCount: events.filter((event) => event.kind === 'note').length,
    chordCount: events.filter((event) => event.kind === 'chord').length,
    barlineCount: events.filter((event) => event.kind === 'separator').length,
  };
}

function nextNonEmptyLine(lines: readonly string[], start: number): { text: string } | null {
  for (let index = start; index < lines.length; index += 1) {
    if (lines[index].trim()) return { text: lines[index] };
  }
  return null;
}

function flushPendingText(
  pending: { text: string; lineNumber: number } | null,
  warnings: TextNotationImportWarning[],
): void {
  if (!pending) return;
  warnings.push({
    lineNumber: pending.lineNumber,
    message: 'Liedtext konnte keiner Notationszeile eindeutig zugeordnet werden.',
    source: pending.text,
    blocking: true,
  });
}

function emptyPreview(
  source: string,
  warnings: TextNotationImportWarning[],
): TextNotationImportPreview {
  return {
    title: '',
    lines: [],
    warnings,
    noteCount: 0,
    chordCount: 0,
    barlineCount: 0,
    canImport: false,
    source,
  };
}
