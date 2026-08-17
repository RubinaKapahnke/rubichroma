import { describe, expect, it, vi } from 'vitest';
import { playerRangeForLoopState, scrollScoreTargetIntoView } from './player.component';

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return DOMRect.fromRect({ x: left, y: top, width, height });
}

describe('scrollScoreTargetIntoView', () => {
  it('moves only the bounded score scroller when a later line becomes active', () => {
    const ancestor = document.createElement('div');
    const scroller = document.createElement('div');
    const line = document.createElement('div');
    const target = document.createElement('button');
    line.className = 'score-line';
    line.append(target);
    scroller.append(line);
    ancestor.append(scroller);
    ancestor.scrollTop = 73;
    scroller.scrollTop = 20;
    scroller.scrollLeft = 5;
    vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue(rect(50, 100, 200, 160));
    vi.spyOn(line, 'getBoundingClientRect').mockReturnValue(rect(50, 310, 320, 80));
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(270, 320, 80, 60));

    scrollScoreTargetIntoView(scroller, target);

    expect(scroller.scrollTop).toBe(222);
    expect(scroller.scrollLeft).toBe(113);
    expect(ancestor.scrollTop).toBe(73);
  });

  it('leaves the score position unchanged while the active line is fully visible', () => {
    const scroller = document.createElement('div');
    const line = document.createElement('div');
    const target = document.createElement('button');
    line.className = 'score-line';
    line.append(target);
    scroller.append(line);
    scroller.scrollTop = 40;
    scroller.scrollLeft = 12;
    vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue(rect(50, 100, 220, 180));
    vi.spyOn(line, 'getBoundingClientRect').mockReturnValue(rect(50, 120, 300, 80));
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect(80, 130, 80, 60));

    scrollScoreTargetIntoView(scroller, target);

    expect(scroller.scrollTop).toBe(40);
    expect(scroller.scrollLeft).toBe(12);
  });
});

describe('playerRangeForLoopState', () => {
  it('keeps the full song range until loop is explicitly enabled', () => {
    const timeline = { beatsPerBar: 4, totalBeats: 42 };

    expect(playerRangeForLoopState(timeline, false, 2, 3)).toEqual({
      startBeat: 0,
      endBeat: 42,
    });
    expect(playerRangeForLoopState(timeline, true, 2, 3)).toEqual({
      startBeat: 4,
      endBeat: 12,
    });
    expect(playerRangeForLoopState(timeline, true, 11, 11)).toEqual({
      startBeat: 40,
      endBeat: 42,
    });
  });
});
