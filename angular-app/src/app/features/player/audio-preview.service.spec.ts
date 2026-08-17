import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_DOCUMENT } from '../../domain/default-document';
import { buildPlayerTimeline, frequencyOf } from '../../domain/player-timeline';
import {
  AUDIO_PREVIEW_BACKEND,
  AudioPreviewBackend,
  AudioPreviewEvent,
  AudioPreviewService,
} from './audio-preview.service';

class FakeAudioPreviewBackend implements AudioPreviewBackend {
  played: readonly AudioPreviewEvent[] = [];
  stopCount = 0;

  play(events: readonly AudioPreviewEvent[]): Promise<void> {
    this.played = events;
    return Promise.resolve();
  }
  stop(): void {
    this.stopCount += 1;
  }
  dispose(): void {}
}

describe('AudioPreviewService', () => {
  let backend: FakeAudioPreviewBackend;
  let service: AudioPreviewService;

  beforeEach(() => {
    backend = new FakeAudioPreviewBackend();
    TestBed.configureTestingModule({
      providers: [
        AudioPreviewService,
        { provide: AUDIO_PREVIEW_BACKEND, useValue: backend },
        { provide: DestroyRef, useValue: { onDestroy: () => undefined } },
      ],
    });
    service = TestBed.inject(AudioPreviewService);
  });

  it('projects a timeline section from beat zero without changing its chords or durations', async () => {
    const timeline = buildPlayerTimeline(DEFAULT_DOCUMENT);
    const blockEvents = timeline.events.filter(
      (event) => event.lineIndex === 0 && event.wordIndex === 0,
    );

    await service.previewTimeline(blockEvents.slice(1));

    expect(backend.played[0].startBeat).toBe(0);
    expect(backend.played.map((event) => event.durationBeats)).toEqual(
      blockEvents.slice(1).map((event) => event.durationBeats),
    );
    expect(backend.played.at(-1)?.frequencies).toHaveLength(3);
    expect(backend.stopCount).toBe(1);
  });

  it('previews one physical pitch and exposes an explicit stop without song mutation', async () => {
    const pitch = { degree: 5, octave: 1 } as const;
    const documentBefore = structuredClone(DEFAULT_DOCUMENT);

    await service.previewPitches([pitch]);
    service.stop();

    expect(backend.played).toEqual([
      { frequencies: [frequencyOf(pitch)], startBeat: 0, durationBeats: 1 },
    ]);
    expect(backend.stopCount).toBe(2);
    expect(DEFAULT_DOCUMENT).toEqual(documentBefore);
  });
});
