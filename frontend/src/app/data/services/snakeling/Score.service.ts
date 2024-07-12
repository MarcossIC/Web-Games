import { Injectable, signal } from '@angular/core';

@Injectable()
export class ScoreService {
  private _score = signal(0);
  private _maxScore = signal(0);

  constructor() {
    let max = localStorage.getItem('snakeling-maxScore');
    this._maxScore.set(max ? parseInt(max) : 0);
  }

  public updateMaxScore(): void {
    if (this._score() > this._maxScore()) {
      this._maxScore.set(this._score());
      localStorage.setItem(
        'snakeling-maxScore',
        JSON.stringify(this._maxScore)
      );
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
