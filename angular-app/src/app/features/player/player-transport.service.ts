import { DestroyRef, Inject, Injectable, InjectionToken, signal } from '@angular/core';
import { getDraw, getTransport, PolySynth, start as startAudio, Synth, Volume } from 'tone';
import { PlayerBeatRange, PlayerTimeline, PlayerTimelineEvent } from '../../domain/player-timeline';

export interface PlayerTransportBackend {
  readonly ppq: number;
  readonly ticks: number;
  reset(): void;
  unlock(): Promise<void>;
  scheduleEvents(events: readonly PlayerTimelineEvent[]): void;
  scheduleEnd(endBeat: number, callback: () => void): void;
  clearEnd(): void;
  start(): void;
  pause(): void;
  stop(): void;
  setTicks(ticks: number): void;
  setBpm(bpm: number): void;
  setLoop(enabled: boolean, range: PlayerBeatRange): void;
  setVolume(percent: number): void;
  dispose(): void;
}

interface FrameScheduler {
  request(callback: FrameRequestCallback): number;
  cancel(id: number): void;
}

export const PLAYER_TRANSPORT_BACKEND = new InjectionToken<PlayerTransportBackend>(
  'PLAYER_TRANSPORT_BACKEND',
  { factory: () => new ToneTransportBackend() },
);

const PLAYER_FRAME_SCHEDULER = new InjectionToken<FrameScheduler>('PLAYER_FRAME_SCHEDULER', {
  factory: () => ({
    request: (callback) => requestAnimationFrame(callback),
    cancel: (id) => cancelAnimationFrame(id),
  }),
});

export const PLAYER_ORIGINAL_BPM = 96;

@Injectable({ providedIn: 'root' })
export class PlayerTransportService {
  private timeline: PlayerTimeline | null = null;
  private range: PlayerBeatRange = { startBeat: 0, endBeat: 0 };
  private frameId: number | null = null;

  readonly playing = signal(false);
  readonly ended = signal(false);
  readonly positionBeat = signal(0);
  readonly speedPercent = signal(75);
  readonly volumePercent = signal(70);
  readonly loopEnabled = signal(false);
  readonly rangeStartBeat = signal(0);
  readonly rangeEndBeat = signal(0);

  constructor(
    @Inject(PLAYER_TRANSPORT_BACKEND) private readonly backend: PlayerTransportBackend,
    @Inject(PLAYER_FRAME_SCHEDULER) private readonly frames: FrameScheduler,
    destroyRef: DestroyRef,
  ) {
    destroyRef.onDestroy(() => this.dispose());
  }

  configure(timeline: PlayerTimeline, requestedRange: PlayerBeatRange | null): void {
    this.cancelProjection();
    this.backend.reset();
    this.timeline = timeline;
    this.range = validRange(requestedRange, timeline.totalBeats) ?? {
      startBeat: 0,
      endBeat: timeline.totalBeats,
    };
    const events = timeline.events.filter(
      (event) => event.startBeat >= this.range.startBeat && event.startBeat < this.range.endBeat,
    );
    this.backend.scheduleEvents(events);
    this.backend.setBpm(this.practiceBpm());
    this.backend.setVolume(this.volumePercent());
    this.backend.setLoop(false, this.range);
    this.scheduleDeterministicEnd();
    this.backend.setTicks(this.range.startBeat * this.backend.ppq);
    this.rangeStartBeat.set(this.range.startBeat);
    this.rangeEndBeat.set(this.range.endBeat);
    this.positionBeat.set(this.range.startBeat);
    this.playing.set(false);
    this.ended.set(false);
    this.loopEnabled.set(false);
  }

  async togglePlay(): Promise<void> {
    if (this.playing()) {
      this.pause();
      return;
    }
    if (!this.timeline || this.range.endBeat <= this.range.startBeat) return;
    if (this.ended() || this.positionBeat() >= this.range.endBeat) {
      this.seek(this.range.startBeat);
    }
    await this.backend.unlock();
    this.ended.set(false);
    this.playing.set(true);
    this.backend.start();
    this.beginProjection();
  }

  pause(): void {
    this.backend.pause();
    this.sampleAbsolutePosition();
    this.playing.set(false);
    this.cancelProjection();
  }

  stop(): void {
    this.backend.stop();
    this.backend.setTicks(this.range.startBeat * this.backend.ppq);
    this.positionBeat.set(this.range.startBeat);
    this.playing.set(false);
    this.ended.set(false);
    this.cancelProjection();
  }

  seek(beat: number | string): void {
    const value = Math.max(this.range.startBeat, Math.min(this.range.endBeat, Number(beat)));
    this.backend.setTicks(value * this.backend.ppq);
    this.positionBeat.set(value);
    this.ended.set(value >= this.range.endBeat && !this.loopEnabled());
  }

  setSpeed(percent: number | string): void {
    const value = Math.max(40, Math.min(120, Number(percent)));
    this.speedPercent.set(value);
    this.backend.setBpm(this.practiceBpm());
    this.sampleAbsolutePosition();
  }

  setVolume(percent: number | string): void {
    const value = Math.max(0, Math.min(100, Number(percent)));
    this.volumePercent.set(value);
    this.backend.setVolume(value);
  }

  setLoop(enabled: boolean): void {
    this.loopEnabled.set(enabled);
    this.backend.setLoop(enabled, this.range);
    if (enabled) {
      this.backend.clearEnd();
      if (this.positionBeat() < this.range.startBeat || this.positionBeat() >= this.range.endBeat) {
        this.seek(this.range.startBeat);
      }
      this.ended.set(false);
    } else {
      this.scheduleDeterministicEnd();
    }
  }

  /**
   * Samples Tone's absolute tick position. Frame cadence never advances musical time.
   * This is public so the skipped-frame contract can be tested without fake wall-clock deltas.
   */
  sampleAbsolutePosition(): void {
    if (!this.timeline) return;
    const beat = this.backend.ticks / this.backend.ppq;
    const projected = this.loopEnabled()
      ? loopedBeat(beat, this.range)
      : Math.min(beat, this.range.endBeat);
    this.positionBeat.set(projected);
  }

  private practiceBpm(): number {
    return PLAYER_ORIGINAL_BPM * (this.speedPercent() / 100);
  }

  private scheduleDeterministicEnd(): void {
    this.backend.scheduleEnd(this.range.endBeat, () => {
      this.positionBeat.set(this.range.endBeat);
      this.playing.set(false);
      this.ended.set(true);
      this.cancelProjection();
    });
  }

  private beginProjection(): void {
    this.cancelProjection();
    const project = () => {
      this.sampleAbsolutePosition();
      if (this.playing()) this.frameId = this.frames.request(project);
    };
    this.frameId = this.frames.request(project);
  }

  private cancelProjection(): void {
    if (this.frameId !== null) this.frames.cancel(this.frameId);
    this.frameId = null;
  }

  private dispose(): void {
    this.cancelProjection();
    this.backend.dispose();
  }
}

class ToneTransportBackend implements PlayerTransportBackend {
  private readonly transport = getTransport();
  private readonly volume = new Volume(-3).toDestination();
  private synth: PolySynth<Synth> | null = null;
  private endEventId: number | null = null;

  get ppq(): number {
    return this.transport.PPQ;
  }

  get ticks(): number {
    return this.transport.ticks;
  }

  reset(): void {
    this.transport.stop();
    this.transport.cancel(0);
    this.transport.loop = false;
    this.transport.ticks = 0;
    this.endEventId = null;
    this.synth?.releaseAll();
  }

  async unlock(): Promise<void> {
    await startAudio();
    this.synth ??= new PolySynth(Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.004, decay: 0.22, sustain: 0.04, release: 1.1 },
    }).connect(this.volume);
  }

  scheduleEvents(events: readonly PlayerTimelineEvent[]): void {
    for (const event of events) {
      this.transport.schedule(
        (time) => {
          this.synth?.triggerAttackRelease(
            [...event.frequencies],
            ticks(event.durationBeats, this.ppq),
            time,
            0.82,
          );
        },
        ticks(event.startBeat, this.ppq),
      );
    }
  }

  scheduleEnd(endBeat: number, callback: () => void): void {
    this.clearEnd();
    this.endEventId = this.transport.schedule(
      (time) => {
        this.transport.pause(time);
        getDraw().schedule(callback, time);
      },
      ticks(endBeat, this.ppq),
    );
  }

  clearEnd(): void {
    if (this.endEventId !== null) this.transport.clear(this.endEventId);
    this.endEventId = null;
  }

  start(): void {
    this.transport.start();
  }

  pause(): void {
    this.transport.pause();
    this.synth?.releaseAll();
  }

  stop(): void {
    this.transport.stop();
    this.synth?.releaseAll();
  }

  setTicks(value: number): void {
    this.transport.ticks = value;
  }

  setBpm(value: number): void {
    this.transport.bpm.value = value;
  }

  setLoop(enabled: boolean, range: PlayerBeatRange): void {
    this.transport.setLoopPoints(ticks(range.startBeat, this.ppq), ticks(range.endBeat, this.ppq));
    this.transport.loop = enabled;
  }

  setVolume(percent: number): void {
    this.volume.volume.rampTo(percent <= 0 ? -Infinity : 20 * Math.log10(percent / 100), 0.04);
  }

  dispose(): void {
    this.reset();
    this.synth?.dispose();
    this.volume.dispose();
  }
}

function ticks(beats: number, ppq: number): `${number}i` {
  return `${Math.round(beats * ppq)}i`;
}

function validRange(range: PlayerBeatRange | null, totalBeats: number): PlayerBeatRange | null {
  if (!range) return null;
  const startBeat = Math.max(0, Math.min(totalBeats, range.startBeat));
  const endBeat = Math.max(startBeat, Math.min(totalBeats, range.endBeat));
  return endBeat > startBeat ? { startBeat, endBeat } : null;
}

function loopedBeat(beat: number, range: PlayerBeatRange): number {
  const duration = range.endBeat - range.startBeat;
  if (duration <= 0 || beat < range.endBeat) return Math.max(range.startBeat, beat);
  return range.startBeat + ((beat - range.startBeat) % duration);
}
