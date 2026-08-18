import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_DOCUMENT } from '../../domain/default-document';
import {
  buildPlayerTimeline,
  PlayerTimelineEvent,
  PlayerTrackId,
} from '../../domain/player-timeline';
import {
  PLAYER_TRANSPORT_BACKEND,
  isMetronomeAccent,
  PlayerTransportBackend,
  PlayerTransportService,
} from './player-transport.service';

class FakeBackend implements PlayerTransportBackend {
  readonly ppq = 192;
  ticks = 0;
  bpm = 0;
  beatsPerBar = 4;
  loop = false;
  scheduled: readonly PlayerTimelineEvent[] = [];
  endBeat = 0;
  endCallback: (() => void) | null = null;
  starts = 0;
  pauses = 0;
  metronome = false;
  trackEnabled: Record<PlayerTrackId, boolean> = { melody: true, accompaniment: true };

  reset(): void {
    this.ticks = 0;
    this.scheduled = [];
  }
  unlock(): Promise<void> {
    return Promise.resolve();
  }
  scheduleEvents(events: readonly PlayerTimelineEvent[]): void {
    this.scheduled = events;
  }
  scheduleEnd(endBeat: number, callback: () => void): void {
    this.endBeat = endBeat;
    this.endCallback = callback;
  }
  clearEnd(): void {
    this.endCallback = null;
  }
  start(): void {
    this.starts += 1;
  }
  pause(): void {
    this.pauses += 1;
  }
  stop(): void {}
  setTicks(ticks: number): void {
    this.ticks = ticks;
  }
  setBpm(bpm: number): void {
    this.bpm = bpm;
  }
  setBeatsPerBar(beatsPerBar: number): void {
    this.beatsPerBar = beatsPerBar;
  }
  setLoop(enabled: boolean): void {
    this.loop = enabled;
  }
  setVolume(): void {}
  setTrackEnabled(track: PlayerTrackId, enabled: boolean): void {
    this.trackEnabled[track] = enabled;
  }
  setMetronomeEnabled(enabled: boolean): void {
    this.metronome = enabled;
  }
  dispose(): void {}
}

describe('PlayerTransportService', () => {
  let backend: FakeBackend;
  let service: PlayerTransportService;

  beforeEach(() => {
    backend = new FakeBackend();
    TestBed.configureTestingModule({
      providers: [
        PlayerTransportService,
        { provide: PLAYER_TRANSPORT_BACKEND, useValue: backend },
        { provide: DestroyRef, useValue: { onDestroy: () => undefined } },
      ],
    });
    service = TestBed.inject(PlayerTransportService);
  });

  it('schedules every event before playback and catches up to an absolute position after a long frame', () => {
    const timeline = buildPlayerTimeline(DEFAULT_DOCUMENT);
    service.configure(timeline, null);
    expect(backend.scheduled.map((event) => event.id)).toEqual(
      timeline.events.map((event) => event.id),
    );

    backend.ticks = 5.75 * backend.ppq;
    service.sampleAbsolutePosition();
    expect(service.positionBeat()).toBe(5.75);
    expect(backend.scheduled).toHaveLength(timeline.events.length);
  });

  it('changes tempo without changing ticks, and preserves position over pause and continue', async () => {
    service.configure(buildPlayerTimeline(DEFAULT_DOCUMENT), null);
    backend.ticks = 2.5 * backend.ppq;
    service.sampleAbsolutePosition();
    service.setSpeed(50);
    expect(backend.bpm).toBe(48);
    expect(service.positionBeat()).toBe(2.5);

    await service.togglePlay();
    service.pause();
    expect(service.positionBeat()).toBe(2.5);
    await service.togglePlay();
    expect(backend.starts).toBe(2);
    expect(backend.pauses).toBe(1);
  });

  it('loops an editor range from absolute ticks and uses a deterministic end when loop is off', () => {
    const timeline = buildPlayerTimeline(DEFAULT_DOCUMENT);
    service.configure(timeline, { startBeat: 1, endBeat: 4 });
    service.setLoop(true);
    backend.ticks = 7.25 * backend.ppq;
    service.sampleAbsolutePosition();
    expect(service.positionBeat()).toBe(1.25);
    expect(backend.endCallback).toBeNull();

    service.setLoop(false);
    expect(backend.endBeat).toBe(4);
    backend.endCallback?.();
    expect(service.positionBeat()).toBe(4);
    expect(service.ended()).toBe(true);
  });

  it('changes a free bar range without rescheduling events and keeps mixer and metronome independent', () => {
    const timeline = buildPlayerTimeline(DEFAULT_DOCUMENT);
    service.configure(timeline, null);
    const scheduled = backend.scheduled;

    service.setRange({ startBeat: 2, endBeat: 6 });
    service.setLoop(true);
    service.setTrackEnabled('accompaniment', false);
    service.setMetronomeEnabled(true);

    expect(service.rangeStartBeat()).toBe(2);
    expect(service.rangeEndBeat()).toBe(6);
    expect(backend.scheduled).toBe(scheduled);
    expect(backend.trackEnabled).toEqual({ melody: true, accompaniment: false });
    expect(backend.metronome).toBe(true);
  });

  it('accents exactly the first beat of every four-beat bar', () => {
    expect(Array.from({ length: 9 }, (_, beat) => isMetronomeAccent(beat))).toEqual([
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
    ]);
  });

  it('uses the configured time signature for metronome accents', () => {
    expect(Array.from({ length: 7 }, (_, beat) => isMetronomeAccent(beat, 3))).toEqual([
      true,
      false,
      false,
      true,
      false,
      false,
      true,
    ]);
  });
});
