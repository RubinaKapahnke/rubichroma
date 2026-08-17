import { projectSongWordEvents } from './song-document';
import { createDocumentFromTextNotation, inspectTextNotation } from './text-notation-import';

describe('text notation import', () => {
  it('normalizes title, lyrics, notes, octave, chords and real bar boundaries', () => {
    const preview = inspectTextNotation(`Mein Lied
Intro
Komm mit
1 2° (1°+1+3+5) | 7
Teil A
3 4`);

    expect(preview).toMatchObject({
      title: 'Mein Lied',
      noteCount: 5,
      chordCount: 1,
      barlineCount: 1,
      canImport: true,
    });
    expect(preview.lines[0]).toMatchObject({
      section: 'Intro',
      text: 'Komm mit',
      normalizedNotation: '1 2° (1°+1+3+5) | 7',
    });
    expect(preview.warnings).toEqual([
      expect.objectContaining({ message: expect.stringContaining('1 Schlag'), blocking: false }),
    ]);

    const document = createDocumentFromTextNotation(preview);
    expect(document.keys).toHaveLength(17);
    expect(projectSongWordEvents(document.song.lines[0].words[0])).toEqual([
      { kind: 'note', pitch: { degree: 1, octave: 0 }, duration: 1, track: 'melody' },
      { kind: 'note', pitch: { degree: 2, octave: 1 }, duration: 1, track: 'melody' },
      {
        kind: 'chord',
        pitches: [
          { degree: 1, octave: 1 },
          { degree: 1, octave: 0 },
          { degree: 3, octave: 0 },
          { degree: 5, octave: 0 },
        ],
        duration: 1,
        track: 'melody',
      },
      { kind: 'separator', track: 'melody' },
      { kind: 'note', pitch: { degree: 7, octave: 0 }, duration: 1, track: 'melody' },
    ]);
  });

  it('imports a textless fragment and expands explicit row references in the current section', () => {
    const preview = inspectTextNotation(`Canon in C-Dur
Teil A
1. 1 2 | (1+3+5)
2. 2 3
3. 3 4
4. 4 5
5. 5 6
6. 6 7
Zeilen 4 → 5 → 6 → 4
Schluss
(1°+1+3+5)`);

    expect(preview.canImport).toBe(true);
    expect(preview.lines).toHaveLength(11);
    expect(preview.lines.slice(6, 10).map((line) => line.repeatedFromRow)).toEqual([4, 5, 6, 4]);
    expect(preview.lines.every((line) => line.text === '')).toBe(true);
    const document = createDocumentFromTextNotation(preview);
    expect(document.song.extra['textNotationImport']).toMatchObject({
      rhythmAssumption: 'one-beat-per-written-event',
    });
  });

  it('keeps unknown or ambiguous input visible and blocks confirmation without a mutation candidate', () => {
    const preview = inspectTextNotation(`Unsicheres Lied
Teil A
1. 1 2 3
Wie die erste Zeile`);

    expect(preview.canImport).toBe(false);
    expect(preview.warnings).toContainEqual(
      expect.objectContaining({
        lineNumber: 4,
        source: 'Wie die erste Zeile',
        blocking: true,
      }),
    );
    expect(() => createDocumentFromTextNotation(preview)).toThrow('ungelöste Hinweise');

    const outsideProfile = inspectTextNotation(`Außerhalb der Palette
7°°`);
    expect(outsideProfile.canImport).toBe(false);
    expect(outsideProfile.warnings).toContainEqual(
      expect.objectContaining({ source: '7°°', blocking: true }),
    );
  });
});
