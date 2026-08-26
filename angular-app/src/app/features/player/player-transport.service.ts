import { DestroyRef, Inject, Injectable, InjectionToken, signal } from '@angular/core';
import { getDraw, getTransport, start as startAudio, Synth, Volume } from 'tone';
import {
  PlayerBeatRange,
  PlayerTimeline,
  PlayerTimelineEvent,
  PlayerTrackId,
} from '../../domain/player-timeline';

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
  setTrackEnabled(track: PlayerTrackId, enabled: boolean): void;
  setMetronomeEnabled(enabled: boolean): void;
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
  readonly melodyEnabled = signal(true);
  readonly accompanimentEnabled = signal(true);
  readonly metronomeEnabled = signal(false);
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
    this.backend.scheduleEvents(timeline.events);
    this.backend.setBpm(this.practiceBpm());
    this.backend.setVolume(this.volumePercent());
    this.backend.setTrackEnabled('melody', this.melodyEnabled());
    this.backend.setTrackEnabled('accompaniment', this.accompanimentEnabled());
    this.backend.setMetronomeEnabled(this.metronomeEnabled());
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

  setRange(requestedRange: PlayerBeatRange): void {
    if (!this.timeline) return;
    const nextRange = validRange(requestedRange, this.timeline.totalBeats);
    if (!nextRange) return;
    this.range = nextRange;
    this.rangeStartBeat.set(nextRange.startBeat);
    this.rangeEndBeat.set(nextRange.endBeat);
    this.backend.setLoop(this.loopEnabled(), nextRange);
    if (this.loopEnabled()) this.backend.clearEnd();
    else this.scheduleDeterministicEnd();
    if (this.positionBeat() < nextRange.startBeat || this.positionBeat() >= nextRange.endBeat) {
      this.seek(nextRange.startBeat);
    }
  }

  setTrackEnabled(track: PlayerTrackId, enabled: boolean): void {
    if (track === 'melody') this.melodyEnabled.set(enabled);
    else this.accompanimentEnabled.set(enabled);
    this.backend.setTrackEnabled(track, enabled);
  }

  setMetronomeEnabled(enabled: boolean): void {
    this.metronomeEnabled.set(enabled);
    this.backend.setMetronomeEnabled(enabled);
  }

  /**
   * Samples Tone's absolute tick position. Frame cadence never advances musical time.
   * This is public so the skipped-frame contract can be tested without fake wall-clock deltas.
   */
  sampleAbsolutePosition(): void {
    if (!this.timeline) return;
    const beat = this.backend.ticks / this.backend.ppq;
    if (!this.loopEnabled() && beat >= this.range.endBeat) {
      this.backend.pause();
      this.positionBeat.set(this.range.endBeat);
      this.playing.set(false);
      this.ended.set(true);
      this.cancelProjection();
      return;
    }
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
  private transport: ReturnType<typeof getTransport> | null = null;
  private fallbackTransport = false;
  private fallbackRunning = false;
  private fallbackAnchorSeconds = 0;
  private fallbackAnchorTicks = 0;
  private volume: Volume | null = null;
  private volumePercent = 70;
  private bpm = PLAYER_ORIGINAL_BPM * 0.75;
  private pendingTicks = 0;
  private loopEnabled = false;
  private loopRange: PlayerBeatRange = { startBeat: 0, endBeat: 0 };
  private scheduledEvents: readonly PlayerTimelineEvent[] = [];
  private eventsInstalled = false;
  private pendingEnd: { beat: number; callback: () => void } | null = null;
  private readonly laneSynths = new Map<number, Synth>();
  private readonly laneVoiceTrack = new Map<number, PlayerTrackId>();
  private readonly scheduledLanes = new Set<number>();
  private readonly trackEnabled: Record<PlayerTrackId, boolean> = {
    melody: true,
    accompaniment: true,
  };
  private metronomeSynth: Synth | null = null;
  private metronomeEnabled = false;
  private endEventId: number | null = null;

  get ppq(): number {
    return this.transport?.PPQ ?? 192;
  }

  get ticks(): number {
    if (this.fallbackTransport) return this.fallbackTicks();
    return this.transport?.ticks ?? this.pendingTicks;
  }

  reset(): void {
    this.transport?.stop();
    this.transport?.cancel(0);
    if (this.transport) {
      this.transport.loop = false;
      this.transport.ticks = 0;
    }
    this.pendingTicks = 0;
    this.fallbackRunning = false;
    this.fallbackAnchorTicks = 0;
    this.loopEnabled = false;
    this.scheduledEvents = [];
    this.eventsInstalled = false;
    this.pendingEnd = null;
    this.endEventId = null;
    this.stopVoices();
    this.scheduledLanes.clear();
  }

  async unlock(): Promise<void> {
    await startAudio();
    const initializingTransport = this.transport === null;
    if (initializingTransport && !this.fallbackTransport) {
      const candidate = getTransport();
      if (isUsableToneTransport(candidate)) this.transport = candidate;
      else this.fallbackTransport = true;
    }
    if (this.fallbackTransport) return;
    if (!this.transport) return;
    if (!this.volume) {
      try {
        this.volume = new Volume(volumeDecibels(this.volumePercent)).toDestination();
      } catch {
        // Some WebKit test runtimes expose a partial Web Audio implementation.
        // Tone.Transport remains authoritative so visual playback still works;
        // real Safari/iPhone audio stays part of the human test gate.
        this.volume = null;
      }
    }
    if (this.volume) {
      for (const lane of this.scheduledLanes) this.synthForLane(lane);
      this.metronomeSynth ??= new Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.015 },
      }).connect(this.volume);
    }
    if (initializingTransport) {
      this.transport.bpm.value = this.bpm;
      this.transport.ticks = this.pendingTicks;
      this.applyLoop();
      this.installEvents();
      this.installEnd();
    }
  }

  scheduleEvents(events: readonly PlayerTimelineEvent[]): void {
    this.scheduledEvents = events;
    this.eventsInstalled = false;
    for (const event of events) event.lanes.forEach((lane) => this.scheduledLanes.add(lane));
    if (this.transport) this.installEvents();
  }

  scheduleEnd(endBeat: number, callback: () => void): void {
    this.clearEndEvent();
    this.pendingEnd = { beat: endBeat, callback };
    if (this.transport) this.installEnd();
  }

  clearEnd(): void {
    this.clearEndEvent();
    this.pendingEnd = null;
  }

  start(): void {
    if (this.fallbackTransport) {
      this.fallbackAnchorTicks = this.pendingTicks;
      this.fallbackAnchorSeconds = monotonicSeconds();
      this.fallbackRunning = true;
    } else {
      this.transport?.start();
    }
  }

  pause(): void {
    if (this.fallbackTransport) {
      this.pendingTicks = this.fallbackTicks();
      this.fallbackRunning = false;
    } else {
      this.transport?.pause();
    }
    this.stopVoices();
  }

  stop(): void {
    if (this.fallbackTransport) this.fallbackRunning = false;
    else this.transport?.stop();
    this.stopVoices();
  }

  setTicks(value: number): void {
    this.pendingTicks = value;
    if (this.fallbackTransport) {
      this.fallbackAnchorTicks = value;
      this.fallbackAnchorSeconds = monotonicSeconds();
    }
    if (this.transport) this.transport.ticks = value;
  }

  setBpm(value: number): void {
    if (this.fallbackTransport && this.fallbackRunning) {
      this.pendingTicks = this.fallbackTicks();
      this.fallbackAnchorTicks = this.pendingTicks;
      this.fallbackAnchorSeconds = monotonicSeconds();
    }
    this.bpm = value;
    if (this.transport) this.transport.bpm.value = value;
  }

  setLoop(enabled: boolean, range: PlayerBeatRange): void {
    this.loopEnabled = enabled;
    this.loopRange = range;
    this.applyLoop();
  }

  setVolume(percent: number): void {
    this.volumePercent = percent;
    this.volume?.volume.rampTo(volumeDecibels(percent), 0.04);
  }

  setTrackEnabled(track: PlayerTrackId, enabled: boolean): void {
    this.trackEnabled[track] = enabled;
    if (!enabled) {
      for (const [lane, activeTrack] of this.laneVoiceTrack) {
        if (activeTrack !== track) continue;
        this.laneSynths.get(lane)?.triggerRelease();
        this.laneVoiceTrack.delete(lane);
      }
    }
  }

  setMetronomeEnabled(enabled: boolean): void {
    this.metronomeEnabled = enabled;
    if (!enabled) this.metronomeSynth?.triggerRelease();
  }

  dispose(): void {
    this.reset();
    for (const synth of this.laneSynths.values()) synth.dispose();
    this.laneSynths.clear();
    this.metronomeSynth?.dispose();
    this.volume?.dispose();
  }

  private installEvents(): void {
    const transport = this.transport;
    if (!transport || this.eventsInstalled) return;
    this.eventsInstalled = true;
    for (const event of this.scheduledEvents) {
      transport.schedule(
        (time) => {
          if (!this.trackEnabled[event.track]) return;
          event.lanes.forEach((lane, index) => {
            const duration = event.laneDurationBeats[index] ?? event.durationBeats;
            if (duration <= 0) return;
            const synth = this.laneSynths.get(lane);
            if (!synth) return;
            synth.triggerRelease(time);
            synth.triggerAttackRelease(event.frequencies[index], ticks(duration, this.ppq), time, 0.82);
            this.laneVoiceTrack.set(lane, event.track);
          });
        },
        ticks(event.startBeat, this.ppq),
      );
    }
    const totalBeats = Math.max(
      0,
      ...this.scheduledEvents.map((event) => event.startBeat + event.durationBeats),
    );
    for (let beat = 0; beat < Math.ceil(totalBeats); beat += 1) {
      transport.schedule((time) => this.playMetronomeBeat(time, beat), ticks(beat, this.ppq));
    }
  }

  private installEnd(): void {
    const transport = this.transport;
    const pendingEnd = this.pendingEnd;
    if (!transport || !pendingEnd || this.endEventId !== null) return;
    this.endEventId = transport.schedule(
      (time) => {
        transport.pause(time);
        getDraw().schedule(pendingEnd.callback, time);
      },
      ticks(pendingEnd.beat, this.ppq),
    );
  }

  private clearEndEvent(): void {
    if (this.endEventId !== null) this.transport?.clear(this.endEventId);
    this.endEventId = null;
  }

  private applyLoop(): void {
    const transport = this.transport;
    if (!transport || this.loopRange.endBeat <= this.loopRange.startBeat) return;
    transport.setLoopPoints(
      ticks(this.loopRange.startBeat, this.ppq),
      ticks(this.loopRange.endBeat, this.ppq),
    );
    transport.loop = this.loopEnabled;
  }

  private synthForLane(lane: number): Synth {
    const existing = this.laneSynths.get(lane);
    if (existing) return existing;
    if (!this.volume) throw new Error('Audioausgabe ist noch nicht freigeschaltet.');
    const synth = new Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.004, decay: 0.22, sustain: 0.04, release: 1.1 },
    }).connect(this.volume);
    this.laneSynths.set(lane, synth);
    return synth;
  }

  private playMetronomeBeat(time: number, beat: number): void {
    if (!this.metronomeEnabled || !this.metronomeSynth) return;
    const accent = isMetronomeAccent(beat);
    this.metronomeSynth.triggerAttackRelease(accent ? 1500 : 1050, '64n', time, accent ? 0.36 : 0.22);
  }

  private stopVoices(): void {
    for (const synth of this.laneSynths.values()) synth.triggerRelease();
    this.laneVoiceTrack.clear();
    this.metronomeSynth?.triggerRelease();
  }

  private fallbackTicks(): number {
    if (!this.fallbackRunning) return this.pendingTicks;
    const elapsedSeconds = monotonicSeconds() - this.fallbackAnchorSeconds;
    return this.fallbackAnchorTicks + elapsedSeconds * (this.bpm / 60) * this.ppq;
  }
}

function volumeDecibels(percent: number): number {
  return percent <= 0 ? -Infinity : 20 * Math.log10(percent / 100);
}

export function isMetronomeAccent(beat: number): boolean {
  return Number.isInteger(beat) && beat >= 0 && beat % 4 === 0;
}

function isUsableToneTransport(
  value: ReturnType<typeof getTransport>,
): value is ReturnType<typeof getTransport> {
  const candidate = value as unknown as {
    start?: unknown;
    stop?: unknown;
    schedule?: unknown;
    bpm?: { value?: unknown };
  };
  return (
    typeof candidate.start === 'function' &&
    typeof candidate.stop === 'function' &&
    typeof candidate.schedule === 'function' &&
    candidate.bpm !== undefined &&
    typeof candidate.bpm.value === 'number'
  );
}

function monotonicSeconds(): number {
  return typeof performance === 'undefined' ? Date.now() / 1000 : performance.now() / 1000;
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
