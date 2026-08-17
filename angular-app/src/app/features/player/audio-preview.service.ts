import { DestroyRef, Inject, Injectable, InjectionToken } from '@angular/core';
import { now, start as startAudio, Synth, Volume } from 'tone';
import { frequencyOf, PlayerTimelineEvent } from '../../domain/player-timeline';
import { Pitch } from '../../domain/music-event';

export interface AudioPreviewEvent {
  readonly frequencies: readonly number[];
  readonly startBeat: number;
  readonly durationBeats: number;
}

export interface AudioPreviewBackend {
  play(events: readonly AudioPreviewEvent[]): Promise<void>;
  stop(): void;
  dispose(): void;
}

export const AUDIO_PREVIEW_BACKEND = new InjectionToken<AudioPreviewBackend>(
  'AUDIO_PREVIEW_BACKEND',
  { factory: () => new ToneAudioPreviewBackend() },
);

export const AUDIO_PREVIEW_BPM = 96;

@Injectable({ providedIn: 'root' })
export class AudioPreviewService {
  constructor(
    @Inject(AUDIO_PREVIEW_BACKEND) private readonly backend: AudioPreviewBackend,
    destroyRef: DestroyRef,
  ) {
    destroyRef.onDestroy(() => this.backend.dispose());
  }

  previewTimeline(events: readonly PlayerTimelineEvent[]): Promise<void> {
    if (events.length === 0) {
      this.stop();
      return Promise.resolve();
    }
    this.backend.stop();
    const firstBeat = Math.min(...events.map((event) => event.startBeat));
    return this.backend.play(
      events.map((event) => ({
        frequencies: event.frequencies,
        startBeat: event.startBeat - firstBeat,
        durationBeats: event.durationBeats,
      })),
    );
  }

  previewPitches(pitches: readonly Pitch[]): Promise<void> {
    this.backend.stop();
    return this.backend.play([
      {
        frequencies: pitches.map(frequencyOf),
        startBeat: 0,
        durationBeats: 1,
      },
    ]);
  }

  stop(): void {
    this.backend.stop();
  }
}

class ToneAudioPreviewBackend implements AudioPreviewBackend {
  private volume: Volume | null = null;
  private voices: Synth[] = [];
  private generation = 0;
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;

  async play(events: readonly AudioPreviewEvent[]): Promise<void> {
    this.stop();
    if (events.length === 0) return;
    const generation = this.generation;
    try {
      await startAudio();
      if (generation !== this.generation) return;

      this.volume = new Volume(-5).toDestination();
      const anchor = now() + 0.025;
      const secondsPerBeat = 60 / AUDIO_PREVIEW_BPM;
      for (const event of events) {
        const startTime = anchor + event.startBeat * secondsPerBeat;
        const durationSeconds = Math.max(0.08, event.durationBeats * secondsPerBeat);
        for (const frequency of event.frequencies) {
          const voice = new Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.004, decay: 0.22, sustain: 0.04, release: 1.1 },
          }).connect(this.volume);
          voice.triggerAttackRelease(frequency, durationSeconds, startTime, 0.82);
          this.voices.push(voice);
        }
      }
      const endBeat = Math.max(...events.map((event) => event.startBeat + event.durationBeats));
      this.cleanupTimer = setTimeout(
        () => this.releaseGeneration(generation),
        (endBeat * secondsPerBeat + 1.25) * 1_000,
      );
    } catch {
      // Some automated WebKit runtimes expose only a partial Web Audio implementation.
      // Real Safari/iPhone playback remains available when Tone can create valid AudioParams.
      this.stop();
    }
  }

  stop(): void {
    this.generation += 1;
    if (this.cleanupTimer !== null) clearTimeout(this.cleanupTimer);
    this.cleanupTimer = null;
    for (const voice of this.voices) {
      voice.triggerRelease();
      voice.dispose();
    }
    this.voices = [];
    this.volume?.dispose();
    this.volume = null;
  }

  dispose(): void {
    this.stop();
  }

  private releaseGeneration(generation: number): void {
    if (generation !== this.generation) return;
    this.stop();
  }
}
