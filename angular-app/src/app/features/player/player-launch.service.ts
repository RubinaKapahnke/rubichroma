import { Injectable, signal } from '@angular/core';
import { SongDocument } from '../../domain/song-document';
import { SongPosition } from '../../domain/song-structure-editing';
import { contiguousPlayerRange } from '../../domain/player-timeline';

export interface PreparedPlayerRange {
  readonly startBeat: number;
  readonly endBeat: number;
}

@Injectable({ providedIn: 'root' })
export class PlayerLaunchService {
  private readonly preparedRangeState = signal<PreparedPlayerRange | null>(null);
  readonly preparedRange = this.preparedRangeState.asReadonly();

  prepare(document: SongDocument | null, positions: readonly SongPosition[]): void {
    this.preparedRangeState.set(document ? contiguousPlayerRange(document, positions) : null);
  }

  consumeRange(): PreparedPlayerRange | null {
    const range = this.preparedRangeState();
    this.preparedRangeState.set(null);
    return range;
  }
}
