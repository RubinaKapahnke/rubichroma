import { describe, expect, it } from 'vitest';
import { DEFAULT_DOCUMENT } from './default-document';
import {
  activeTimelineLaneEvent,
  activeTimelineWord,
  buildPlayerTimeline,
  contiguousPlayerRange,
  nextTimelineEvent,
} from './player-timeline';
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
    expect(timeline.bars).toEqual([
      { number: 1, startBeat: 0, endBeat: 4 },
      { number: 2, startBeat: 4, endBeat: 7 },
    ]);
    expect(timeline.events[3]).toMatchObject({ track: 'accompaniment', barNumber: 1 });
    expect(timeline.words[0]).toMatchObject({ text: 'Willkommen', startBeat: 0, endBeat: 4 });
    expect(timeline.words[1]).toMatchObject({ text: null, startBeat: 4, endBeat: 7 });
  });

  it('projects syllable continuation, punctuation and instrumental pauses without placeholder timing', () => {
    const document = cloneDocument(DEFAULT_DOCUMENT);
    document.song.lines[0].words = [
      { ...document.song.lines[0].words[0], text: 'Twin-' },
      { ...document.song.lines[0].words[0], text: 'kle,' },
      { ...document.song.lines[0].words[0], text: 'won-' },
      { ...document.song.lines[0].words[0], text: 'der.' },
      { ...document.song.lines[0].words[1], text: '♪' },
    ];

    const timeline = buildPlayerTimeline(document);
    expect(timeline.words[0]).toMatchObject({ text: 'Twin-', continuesWord: true, wordEnd: false });
    expect(timeline.words[1]).toMatchObject({ text: 'kle,', continuesWord: false, wordEnd: true });
    expect(timeline.words[2]).toMatchObject({ text: 'won-', continuesWord: true, wordEnd: false });
    expect(timeline.words[3]).toMatchObject({ text: 'der.', continuesWord: false, wordEnd: true });
    expect(timeline.words[4].text).toBeNull();
    expect(activeTimelineWord(timeline, timeline.words[4].startBeat)).toBeNull();
  });

  it('ends a physical lane at its next attack and exposes a short retrigger pulse plus next melody', () => {
    const document = cloneDocument(DEFAULT_DOCUMENT);
    document.song.lines[0].words[0].events = [
      {
        kind: 'chord',
        pitches: [
          { degree: 1, octave: 0 },
          { degree: 3, octave: 0 },
        ],
        duration: 'quarter',
      },
      { kind: 'note', pitch: { degree: 1, octave: 0 }, duration: 'quarter' },
    ];
    document.song.lines[0].words = [document.song.lines[0].words[0]];
    const timeline = buildPlayerTimeline(document);
    const lane = timeline.events[0].lanes[0];

    expect(timeline.events[0].laneDurationBeats[0]).toBe(1);
    expect(activeTimelineLaneEvent(timeline, lane, 0.44)?.id).toBe(timeline.events[0].id);
    expect(activeTimelineLaneEvent(timeline, lane, 0.46)).toBeNull();
    expect(activeTimelineLaneEvent(timeline, lane, 1.01)?.id).toBe(timeline.events[1].id);
    expect(nextTimelineEvent(timeline, 0)?.id).toBe(timeline.events[1].id);
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

  it('projects explicit and missing event durations onto the same transport axis', () => {
    const document = cloneDocument(DEFAULT_DOCUMENT);
    const firstEvent = document.song.lines[0].words[0].events[0];
    const secondEvent = document.song.lines[0].words[0].events[1];
    if (firstEvent.kind !== 'separator') firstEvent.duration = 2;
    if (secondEvent.kind !== 'separator') delete secondEvent.duration;

    const timeline = buildPlayerTimeline(document);
    expect(timeline.events.slice(0, 3).map((event) => event.startBeat)).toEqual([0, 2, 3]);
    expect(timeline.events[0].durationBeats).toBe(2);
    expect(timeline.events[1].durationBeats).toBe(1);
    expect(timeline.words[0]).toMatchObject({ startBeat: 0, endBeat: 5 });
    expect(timeline.totalBeats).toBe(8);
  });

  it('carries only a contiguous editor selection into a non-empty practice range', () => {
    expect(contiguousPlayerRange(DEFAULT_DOCUMENT, [{ lineIndex: 0, wordIndex: 0 }])).toEqual({
      startBeat: 0,
      endBeat: 4,
    });
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
