import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  activeTimelineEvent,
  activeTimelineWord,
  buildPlayerTimeline,
  PlayerKey,
  PlayerTimeline,
  PlayerTimelineEvent,
  PlayerTimelineLine,
  PlayerTimelineWord,
} from '../../domain/player-timeline';
import { Pitch } from '../../domain/music-event';
import { ThemeService } from '../../infrastructure/theme.service';
import { SongEditorStore } from '../song-editor/song-editor.store';
import { PlayerLaunchService } from './player-launch.service';
import { PLAYER_ORIGINAL_BPM, PlayerTransportService } from './player-transport.service';

type ViewMode = 'flow' | 'tab';
type ColorAid = 'full' | 'soft' | 'off';
type TextState = 'past' | 'current' | 'upcoming';

const FLOW_HORIZON_BEATS = 8;

@Component({
  selector: 'app-player',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './player.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.reduce-motion]': 'reducedMotion()' },
})
export class PlayerComponent implements OnDestroy {
  readonly store = inject(SongEditorStore);
  readonly transport = inject(PlayerTransportService);
  readonly theme = inject(ThemeService);
  private readonly launch = inject(PlayerLaunchService);
  private configuredHydration = -1;

  readonly timeline = signal<PlayerTimeline | null>(null);
  readonly viewMode = signal<ViewMode>('flow');
  readonly colorAid = signal<ColorAid>('full');
  readonly showDegrees = signal(true);
  readonly showLetters = signal(true);
  readonly reducedMotion = signal(
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  readonly originalBpm = PLAYER_ORIGINAL_BPM;
  readonly speedOptions = [50, 75, 100] as const;

  readonly activeEvent = computed(() => {
    const timeline = this.timeline();
    return timeline ? activeTimelineEvent(timeline, this.transport.positionBeat()) : null;
  });
  readonly activeWord = computed(() => {
    const timeline = this.timeline();
    return timeline ? activeTimelineWord(timeline, this.transport.positionBeat()) : null;
  });
  readonly visualBeat = computed(() =>
    this.reducedMotion()
      ? Math.floor(this.transport.positionBeat() * 4) / 4
      : this.transport.positionBeat(),
  );
  readonly visibleEvents = computed(() => {
    const timeline = this.timeline();
    if (!timeline) return [];
    const beat = this.visualBeat();
    return timeline.events.filter(
      (event) =>
        event.startBeat >= this.transport.rangeStartBeat() &&
        event.startBeat < this.transport.rangeEndBeat() &&
        event.startBeat + event.durationBeats > beat - 0.15 &&
        event.startBeat <= beat + FLOW_HORIZON_BEATS,
    );
  });
  readonly textLines = computed(() => this.visibleTextLines());
  readonly positionPercent = computed(() => {
    const start = this.transport.rangeStartBeat();
    const duration = this.transport.rangeEndBeat() - start;
    return duration <= 0 ? 0 : ((this.transport.positionBeat() - start) / duration) * 100;
  });
  readonly currentBar = computed(() => Math.floor(this.transport.positionBeat() / 4) + 1);

  constructor() {
    effect(() => {
      const document = this.store.document();
      const hydration = this.store.hydrationVersion();
      if (!document || hydration === this.configuredHydration) return;
      this.configuredHydration = hydration;
      const timeline = buildPlayerTimeline(document);
      this.timeline.set(timeline);
      const preparedRange = this.launch.consumeRange();
      this.transport.configure(timeline, preparedRange);
      if (preparedRange) this.transport.setLoop(true);
    });
    void this.store.initialize();
  }

  ngOnDestroy(): void {
    this.transport.stop();
  }

  changeTheme(event: Event): void {
    this.theme.setPreference((event.target as HTMLSelectElement).value);
  }

  setView(view: ViewMode): void {
    this.viewMode.set(view);
  }

  setColorAid(value: ColorAid): void {
    this.colorAid.set(value);
  }

  isLaneActive(lane: number): boolean {
    return this.activeEvent()?.lanes.includes(lane) ?? false;
  }

  flowTransform(event: PlayerTimelineEvent): string {
    const beatsUntilStart = event.startBeat - this.visualBeat();
    const progress = Math.max(0, Math.min(1, 1 - beatsUntilStart / FLOW_HORIZON_BEATS));
    return `translate3d(-50%, calc(${progress} * (100cqh - 2.1rem)), 0)`;
  }

  tabTransform(event: PlayerTimelineEvent): string {
    const beatsUntilStart = event.startBeat - this.visualBeat();
    const left = Math.max(-12, Math.min(100, 28 + (beatsUntilStart / FLOW_HORIZON_BEATS) * 72));
    return `translate3d(${left}cqw, 0, 0)`;
  }

  eventHeight(event: PlayerTimelineEvent): string {
    return `${Math.max(2.1, event.durationBeats * 3.4)}rem`;
  }

  eventWidth(event: PlayerTimelineEvent): string {
    return `${Math.max(3.6, event.durationBeats * 5.2)}rem`;
  }

  selectEvent(event: PlayerTimelineEvent): void {
    this.transport.seek(event.startBeat);
  }

  eventDegreeLabels(event: PlayerTimelineEvent): string {
    return event.pitches.map((pitch) => this.keyForPitch(pitch)?.degreeLabel ?? '?').join(' + ');
  }

  eventLetterLabels(event: PlayerTimelineEvent): string {
    return event.pitches.map((pitch) => this.keyForPitch(pitch)?.letter ?? '?').join(' + ');
  }

  pitchDegreeLabel(event: PlayerTimelineEvent, index: number): string {
    return this.keyForPitch(event.pitches[index])?.degreeLabel ?? '?';
  }

  pitchLetterLabel(event: PlayerTimelineEvent, index: number): string {
    return this.keyForPitch(event.pitches[index])?.letter ?? '?';
  }

  wordState(word: PlayerTimelineWord): TextState {
    const active = this.activeWord();
    if (active?.id === word.id) return 'current';
    return word.endBeat <= this.transport.positionBeat() ? 'past' : 'upcoming';
  }

  lineRole(line: PlayerTimelineLine): 'current' | 'next' {
    return line.lineIndex === this.textLines()[0]?.lineIndex ? 'current' : 'next';
  }

  formatBeatTime(beats: number): string {
    const seconds = (beats * (60 / PLAYER_ORIGINAL_BPM)) / (this.transport.speedPercent() / 100);
    const rounded = Math.max(0, Math.round(seconds));
    return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
  }

  private visibleTextLines(): readonly PlayerTimelineLine[] {
    const timeline = this.timeline();
    if (!timeline) return [];
    const textLines = timeline.lines
      .map((line) => ({
        ...line,
        words: line.words.filter(
          (word) =>
            word.text &&
            word.endBeat > this.transport.rangeStartBeat() &&
            word.startBeat < this.transport.rangeEndBeat(),
        ),
      }))
      .filter((line) => line.words.length > 0);
    if (textLines.length <= 2) return textLines;

    const activeLine = this.activeWord()?.lineIndex;
    const currentIndex = Math.max(
      0,
      textLines.findIndex((line) =>
        activeLine !== undefined
          ? line.lineIndex === activeLine
          : this.transport.positionBeat() < line.endBeat,
      ),
    );
    return textLines.slice(currentIndex, currentIndex + 2);
  }

  private keyForPitch(pitch: Pitch): PlayerKey | undefined {
    return this.timeline()?.keys.find(
      (key) => key.pitch.degree === pitch.degree && key.pitch.octave === pitch.octave,
    );
  }
}
