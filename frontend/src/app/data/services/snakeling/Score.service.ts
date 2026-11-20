import { Injectable, signal } from '@angular/core';
import { keepBest, persisted } from '@app-persistence';
import { snakelingRecords } from './snakeling-saves';

@Injectable()
export class ScoreService {
  private _score = signal(0);
  private readonly records = persisted(snakelingRecords);

  public updateMaxScore(): void {
    const best = keepBest(this.maxScore, this._score(), 'higher');
    if (best.improved) this.records.set({ bestScore: best.value });
  }

  public updateScore(): void {
    this._score.update((val) => val + 8);
  }

  public resetScore(): void {
    this.score = 0;
  }

  public get score() {
    return this._score();
  }
  public get maxScore() {
    return this.records.value().bestScore;
  }
  public set score(updated: number) {
    this._score.set(updated);
  }
}
