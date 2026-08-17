import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  activeTimelineEvent,
  activeTimelineLaneEvent,
  activeTimelineWord,
  buildPlayerTimeline,
  nextTimelineEvent,
  PlayerKey,
  PlayerTimeline,
  PlayerTimelineEvent,
  PlayerTimelineLine,
  PlayerTimelineWord,
  PlayerTrackId,
} from '../../domain/player-timeline';
import { Pitch } from '../../domain/music-event';
import { ThemeService } from '../../infrastructure/theme.service';
import { SongEditorStore } from '../song-editor/song-editor.store';
import { PlayerLaunchService } from './player-launch.service';
import { PLAYER_ORIGINAL_BPM, PlayerTransportService } from './player-transport.service';

type ViewMode = 'flow' | 'tab';
type ColorAid = 'full' | 'soft' | 'off';
type TextState = 'past' | 'current' | 'upcoming';
type TempoUnit = 'bpm' | 'percent';

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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private configuredHydration = -1;
  private followedScoreId = '';

  readonly timeline = signal<PlayerTimeline | null>(null);
  readonly viewMode = signal<ViewMode>('flow');
  readonly colorAid = signal<ColorAid>('full');
  readonly showDegrees = signal(true);
  readonly showLetters = signal(true);
  readonly tempoUnit = signal<TempoUnit>('bpm');
  readonly previewBars = signal<1 | 2 | 4>(2);
  readonly loopStartBar = signal(1);
  readonly loopEndBar = signal(2);
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
  readonly nextMelodyEvent = computed(() => {
    const timeline = this.timeline();
    return timeline ? nextTimelineEvent(timeline, this.transport.positionBeat()) : null;
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
    const horizon = this.previewBars() * timeline.beatsPerBar;
    return timeline.events.filter(
      (event) =>
        event.startBeat >= this.transport.rangeStartBeat() &&
        event.startBeat < this.transport.rangeEndBeat() &&
        event.startBeat + event.durationBeats > beat - 0.15 &&
        event.startBeat <= beat + horizon &&
        this.trackEnabled(event.track),
    );
  });
  readonly textLines = computed(() => this.visibleTextLines());
  readonly scoreWords = computed(() => this.timeline()?.words ?? []);
  readonly positionPercent = computed(() => {
    const start = this.transport.rangeStartBeat();
    const duration = this.transport.rangeEndBeat() - start;
    return duration <= 0 ? 0 : ((this.transport.positionBeat() - start) / duration) * 100;
  });
  readonly currentBar = computed(() => {
    const count = this.timeline()?.bars.length ?? 1;
    return Math.min(count, Math.floor(this.transport.positionBeat() / 4) + 1);
  });
  readonly tempoDisplayValue = computed(() =>
    this.tempoUnit() === 'bpm'
      ? (this.originalBpm * this.transport.speedPercent()) / 100
      : this.transport.speedPercent(),
  );

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
      const range = preparedRange ?? { startBeat: 0, endBeat: timeline.totalBeats };
      this.loopStartBar.set(Math.floor(range.startBeat / timeline.beatsPerBar) + 1);
      this.loopEndBar.set(
        Math.max(this.loopStartBar(), Math.ceil(range.endBeat / timeline.beatsPerBar)),
      );
      if (preparedRange) this.transport.setLoop(true);
    });

    effect(() => {
      const activeId = this.activeWord()?.id ?? '';
      if (!activeId || activeId === this.followedScoreId || !this.transport.playing()) return;
      this.followedScoreId = activeId;
      queueMicrotask(() => {
        this.host.nativeElement
          .querySelector<HTMLElement>(`[data-score-word="${activeId}"]`)
          ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    });
    void this.store.initialize();
  }

  ngOnDestroy(): void {
    this.transport.stop();
  }

  @HostListener('document:keydown.space', ['$event'])
  handleSpace(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.repeat || this.isInteractiveTarget(keyboardEvent.target, null)) return;
    keyboardEvent.preventDefault();
    void this.transport.togglePlay();
  }

  handlePlayerSurfaceClick(event: MouseEvent): void {
    if (this.isInteractiveTarget(event.target, event.currentTarget)) return;
    void this.transport.togglePlay();
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

  setShowDegrees(enabled: boolean): void {
    if (!enabled && !this.showLetters()) return;
    this.showDegrees.set(enabled);
  }

  setShowLetters(enabled: boolean): void {
    if (!enabled && !this.showDegrees()) return;
    this.showLetters.set(enabled);
  }

  setPreviewBars(value: number): void {
    if (value === 1 || value === 2 || value === 4) this.previewBars.set(value);
  }

  setTempoUnit(unit: TempoUnit): void {
    this.tempoUnit.set(unit);
  }

  setTempoDisplayValue(value: number | string): void {
    const numeric = Number(value);
    this.transport.setSpeed(
      this.tempoUnit() === 'bpm' ? (numeric / this.originalBpm) * 100 : numeric,
    );
  }

  tempoPresetValue(percent: number): number {
    return this.tempoUnit() === 'bpm' ? (this.originalBpm * percent) / 100 : percent;
  }

  tempoValueLabel(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${
      this.tempoUnit() === 'bpm' ? 'BPM' : '%'
    }`;
  }

  setLoopStartBar(value: number | string): void {
    const timeline = this.timeline();
    const bar = Number(value);
    if (!timeline || !Number.isInteger(bar) || bar < 1 || bar > this.loopEndBar()) return;
    this.loopStartBar.set(bar);
    this.applyLoopRange();
  }

  setLoopEndBar(value: number | string): void {
    const timeline = this.timeline();
    const bar = Number(value);
    if (
      !timeline ||
      !Number.isInteger(bar) ||
      bar < this.loopStartBar() ||
      bar > timeline.bars.length
    ) return;
    this.loopEndBar.set(bar);
    this.applyLoopRange();
  }

  setLoopEnabled(enabled: boolean): void {
    if (enabled) this.applyLoopRange();
    this.transport.setLoop(enabled);
  }

  isLaneActive(lane: number): boolean {
    const timeline = this.timeline();
    return timeline
      ? activeTimelineLaneEvent(timeline, lane, this.transport.positionBeat()) !== null
      : false;
  }

  isLaneUpcoming(lane: number): boolean {
    return !this.isLaneActive(lane) && this.nextMelodyEvent()?.lanes.includes(lane) === true;
  }

  lanePulseToken(lane: number): string {
    const timeline = this.timeline();
    return timeline
      ? activeTimelineLaneEvent(timeline, lane, this.transport.positionBeat())?.id ?? ''
      : '';
  }

  flowProgress(event: PlayerTimelineEvent): string {
    const horizon = this.previewBars() * 4;
    const progress = 100 - ((event.startBeat - this.visualBeat()) / horizon) * 100;
    return `${Math.max(-24, Math.min(116, progress))}%`;
  }

  tabPosition(event: PlayerTimelineEvent): string {
    const horizon = this.previewBars() * 4;
    const left = 30 + ((event.startBeat - this.visualBeat()) / horizon) * 68;
    return `${Math.max(-18, Math.min(98, left))}%`;
  }

  laneEventHeight(event: PlayerTimelineEvent, lane: number): string {
    const index = event.lanes.indexOf(lane);
    const duration = event.laneDurationBeats[index] ?? event.durationBeats;
    return `${Math.max(26, duration * 30)}px`;
  }

  eventWidth(event: PlayerTimelineEvent): string {
    return `${Math.max(5.5, event.durationBeats * 6.5)}%`;
  }

  selectEvent(event: PlayerTimelineEvent): void {
    this.transport.seek(event.startBeat);
  }

  selectScoreWord(word: PlayerTimelineWord): void {
    this.transport.seek(word.startBeat);
  }

  eventsForWord(word: PlayerTimelineWord): readonly PlayerTimelineEvent[] {
    const ids = new Set(word.eventIds);
    return this.timeline()?.events.filter((event) => ids.has(event.id)) ?? [];
  }

  scoreDegreeText(word: PlayerTimelineWord): string {
    return this.eventsForWord(word)
      .map((event) => event.pitches.map((pitch) => this.keyForPitch(pitch)?.degreeLabel ?? '?').join('+'))
      .join(' · ');
  }

  scoreNoteText(word: PlayerTimelineWord): string {
    return this.eventsForWord(word)
      .map((event) => event.pitches.map((pitch) => this.keyForPitch(pitch)?.letter ?? '?').join('+'))
      .join(' · ');
  }

  eventDegreeLabel(event: PlayerTimelineEvent, lane: number): string {
    return this.keyForPitch(event.pitches[event.lanes.indexOf(lane)])?.degreeLabel ?? '?';
  }

  eventLetterLabel(event: PlayerTimelineEvent, lane: number): string {
    return this.keyForPitch(event.pitches[event.lanes.indexOf(lane)])?.letter ?? '?';
  }

  eventDegreeLabels(event: PlayerTimelineEvent): string {
    return event.lanes.map((lane) => this.eventDegreeLabel(event, lane)).join(' + ');
  }

  eventLetterLabels(event: PlayerTimelineEvent): string {
    return event.lanes.map((lane) => this.eventLetterLabel(event, lane)).join(' + ');
  }

  wordState(word: PlayerTimelineWord): TextState {
    const active = this.activeWord();
    if (active?.id === word.id) return 'current';
    return word.endBeat <= this.transport.positionBeat() ? 'past' : 'upcoming';
  }

  lineRole(line: PlayerTimelineLine): 'current' | 'next' {
    return line.lineIndex === this.textLines()[0]?.lineIndex ? 'current' : 'next';
  }

  keyDegree(key: PlayerKey): string {
    return String(key.pitch.degree);
  }

  octaveDots(key: PlayerKey, direction: 'up' | 'down'): string {
    const count = direction === 'up' ? Math.max(0, key.pitch.octave) : Math.max(0, -key.pitch.octave);
    return '•'.repeat(count);
  }

  formatBeatTime(beats: number): string {
    const seconds = (beats * 60) / ((this.originalBpm * this.transport.speedPercent()) / 100);
    const rounded = Math.max(0, Math.round(seconds));
    return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
  }

  trackEnabled(track: PlayerTrackId): boolean {
    return track === 'melody'
      ? this.transport.melodyEnabled()
      : this.transport.accompanimentEnabled();
  }

  private applyLoopRange(): void {
    const timeline = this.timeline();
    if (!timeline) return;
    this.transport.setRange({
      startBeat: (this.loopStartBar() - 1) * timeline.beatsPerBar,
      endBeat: Math.min(timeline.totalBeats, this.loopEndBar() * timeline.beatsPerBar),
    });
  }

  private visibleTextLines(): readonly PlayerTimelineLine[] {
    const timeline = this.timeline();
    if (!timeline) return [];
    const textLines = timeline.lines
      .map((line) => ({ ...line, words: line.words.filter((word) => word.text !== null) }))
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

  private isInteractiveTarget(target: EventTarget | null, boundary: EventTarget | null): boolean {
    const element = target instanceof Element ? target : null;
    const interactive =
      element?.closest('button, a, input, select, summary, details, label, textarea') ?? null;
    return (
      interactive !== null &&
      (!boundary || (boundary instanceof Node && boundary.contains(interactive)))
    );
  }

  private keyForPitch(pitch: Pitch): PlayerKey | undefined {
    return this.timeline()?.keys.find(
      (key) => key.pitch.degree === pitch.degree && key.pitch.octave === pitch.octave,
    );
  }
}
