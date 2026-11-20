import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

const MAX_SCORE_KEY = 'snakeling-maxScore';

@Injectable()
export class ScoreService {
  private _score = signal(0);
  private _maxScore = signal(0);
  private PLATFORM = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.PLATFORM)) {
      const stored = Number.parseInt(
        localStorage.getItem(MAX_SCORE_KEY) ?? '',
        10
      );
      this._maxScore.set(Number.isNaN(stored) ? 0 : stored);
    }
  }

  public updateMaxScore(): void {
    if (this._score() > this._maxScore()) {
      this._maxScore.set(this._score());
      localStorage.setItem(MAX_SCORE_KEY, String(this._maxScore()));
    }
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
    return this._maxScore();
  }
  public set score(updated: number) {
    this._score.set(updated);
  }
}
