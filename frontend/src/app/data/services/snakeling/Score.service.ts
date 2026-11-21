import { Injectable, signal } from '@angular/core';
import { keepBest, persisted } from '@app-persistence';
import { SnakelingMode } from '@app/data/models/snakeling/Mode';
import { SnakelingRecords, snakelingRecords } from './snakeling-saves';

/** Points earned for each apple. */
export const POINTS_PER_APPLE = 8;

/** Where each mode keeps its best score. */
const RECORD_FIELD: Record<SnakelingMode, keyof SnakelingRecords> = {
  portal: 'bestScore',
  classic: 'bestClassic',
};

@Injectable()
export class ScoreService {
  private _score = signal(0);
  private readonly records = persisted(snakelingRecords);

  /** Saves the current score if it beats the best one of `mode`. */
  public updateMaxScore(mode: SnakelingMode): void {
    const best = keepBest(this.bestFor(mode), this._score(), 'higher');
    if (best.improved) {
      this.records.set({
        ...this.records.value(),
        [RECORD_FIELD[mode]]: best.value,
      });
    }
  }

  public updateScore(): void {
    this._score.update((val) => val + POINTS_PER_APPLE);
  }

  public resetScore(): void {
    this.score = 0;
  }

  /** The best score ever made in `mode`. */
  public bestFor(mode: SnakelingMode): number {
    return this.records.value()[RECORD_FIELD[mode]];
  }

  public get score() {
    return this._score();
  }
  public set score(updated: number) {
    this._score.set(updated);
  }
}
