import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PointsService {
  private _score = signal(0);
  private _maxScore = signal(0);

  private _level = signal(0);
  private _maxLevel = signal(1);

  private _time = signal('00:00');
  private _maxTime = signal('00:00');

  constructor() {
    const maxScoreS = localStorage.getItem('tetris-maxScore');
    const maxLevelS = localStorage.getItem('tetris-maxLevel');
    const maxTimeS = localStorage.getItem('tetris-maxTime');
    this._maxScore.set(maxScoreS ? parseInt(maxScoreS, 10) : 0);
    this._maxLevel.set(maxLevelS ? parseInt(maxLevelS, 10) : 1);
    this._maxTime.set(maxTimeS ? maxTimeS : '00:00');
  }

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

  updateMaxTime(updateMaxTime: string) {
    this.maxTime = updateMaxTime;
    localStorage.setItem('tetris-maxTime', this.maxTime);
  }

  updateMaxScore() {
    if (this.score > this.maxScore) {
      this.maxScore = this.score;
      localStorage.setItem('tetris-maxScore', JSON.stringify(this.maxScore));
    }
  }

  updateMaxLevel() {
    if (this.level > this.maxLevel) {
      this.maxLevel = this.level;
      localStorage.setItem('tetris-maxLevel', JSON.stringify(this.maxLevel));
    }
  }

  updateLevel(level: number) {
    this.level = level;
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
    return this._maxScore();
  }

  set maxScore(value: number) {
    this._maxScore.set(value);
    localStorage.setItem('tetris-maxScore', JSON.stringify(value));
  }

  get level(): number {
    return this._level();
  }

  set level(value: number) {
    this._level.set(value);
  }

  get maxLevel(): number {
    return this._maxLevel();
  }

  set maxLevel(value: number) {
    this._maxLevel.set(value);
    localStorage.setItem('tetris-maxLevel', JSON.stringify(value));
  }

  get time(): string {
    return this._time();
  }

  set time(value: string) {
    this._time.set(value);
  }

  get maxTime(): string {
    return this._maxTime();
  }

  set maxTime(value: string) {
    this._maxTime.set(value);
    localStorage.setItem('tetris-maxTime', value);
  }
}
