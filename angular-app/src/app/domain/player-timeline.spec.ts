import { describe, expect, it } from 'vitest';
import { DEFAULT_DOCUMENT } from './default-document';
import { buildPlayerTimeline, contiguousPlayerRange } from './player-timeline';
import { cloneDocument } from './song-document';

describe('player timeline', () => {
  it('projects the current structured song, physical key lanes and text onto one beat axis', () => {
    const timeline = buildPlayerTimeline(DEFAULT_DOCUMENT);

    expect(timeline.keys).toHaveLength(17);
    expect(timeline.keys.map((key) => key.degreeLabel)).toEqual(
      DEFAULT_DOCUMENT.keys.map((key) => key['value']),
    );
    expect(timeline.events.map((event) => event.startBeat)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(timeline.events[3].pitches).toHaveLength(3);
    expect(timeline.totalBeats).toBe(7);
    expect(timeline.words[0]).toMatchObject({ text: 'Willkommen', startBeat: 0, endBeat: 4 });
    expect(timeline.words[1]).toMatchObject({ text: null, startBeat: 4, endBeat: 7 });
  });

  it('keeps separators time-neutral and never turns unknown or instrumental text into placeholders', () => {
    const document = cloneDocument(DEFAULT_DOCUMENT);
    document.song.lines[0].words[0].text = '';
    document.song.lines[0].words[0].events = [
      { kind: 'note', pitch: { degree: 1, octave: 0 }, duration: 'quarter' },
      { kind: 'separator' },
      { kind: 'note', pitch: { degree: 2, octave: 0 }, duration: 'quarter' },
    ];

    const timeline = buildPlayerTimeline(document);
    expect(timeline.events.slice(0, 2).map((event) => event.startBeat)).toEqual([0, 1]);
    expect(timeline.words[0].text).toBeNull();
  });

  it('carries only a contiguous editor selection into a non-empty practice range', () => {
    expect(
      contiguousPlayerRange(DEFAULT_DOCUMENT, [
        { lineIndex: 0, wordIndex: 0 },
        { lineIndex: 0, wordIndex: 1 },
      ]),
    ).toEqual({ startBeat: 0, endBeat: 7 });

    const document = cloneDocument(DEFAULT_DOCUMENT);
    document.song.lines.push({
      words: [{ ...document.song.lines[0].words[0], text: 'Später' }],
      extra: {},
    });
    expect(
      contiguousPlayerRange(document, [
        { lineIndex: 0, wordIndex: 0 },
        { lineIndex: 1, wordIndex: 0 },
      ]),
    ).toBeNull();
  });
});
