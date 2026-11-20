import { Injectable, signal } from '@angular/core';
import { keepBest, persisted } from '@app-persistence';
import { tetrisRecords } from './tetris-saves';

@Injectable()
export class PointsService {
  private _score = signal(0);
  private _level = signal(0);
  private _time = signal('00:00');
  private readonly records = persisted(tetrisRecords);

  updateMaxPoints() {
    this.updateMaxLevel();
    this.updateMaxScore();
  }

  addScore() {
    this.score += 100;
  }

  updateTime(updateTime: string) {
    this.time = updateTime;
  }

  /** Keeps `seconds` as the best time when the game lasted longer than any before. */
  recordTime(seconds: number) {
    const best = keepBest(this.records.value().bestTimeSeconds, seconds, 'higher');
    if (best.improved) this.records.update((records) => ({ ...records, bestTimeSeconds: best.value }));
  }

  updateMaxScore() {
    const best = keepBest(this.maxScore, this.score, 'higher');
    if (best.improved) this.records.update((records) => ({ ...records, bestScore: best.value }));
  }

  updateMaxLevel() {
    const best = keepBest(this.maxLevel, this.level, 'higher');
    if (best.improved) this.records.update((records) => ({ ...records, bestLevel: best.value }));
  }

  updateLevel(level: number) {
    this.level = level;
  }

  calculateLevel(): number {
    let level;
    if (this.score < 500) level = 1;
    else if (this.score < 1000) level = 2;
    else if (this.score < 1500) level = 3;
    else level = 4;
    this.updateLevel(level);
    return level;
  }

  resetScore() {
    this.score = 0;
  }

  resetLevel() {
    this.level = 0;
  }

  get score(): number {
    return this._score();
  }

  set score(value: number) {
    this._score.set(value);
  }

  get maxScore(): number {
    return this.records.value().bestScore;
  }

  get level(): number {
    return this._level();
  }

  set level(value: number) {
    this._level.set(value);
  }

  get maxLevel(): number {
    return this.records.value().bestLevel;
  }

  get time(): string {
    return this._time();
  }

  set time(value: string) {
    this._time.set(value);
  }

  /** The best time as mm:ss, the way the chronometer shows a game. */
  get maxTime(): string {
    const seconds = this.records.value().bestTimeSeconds;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
  }
}
