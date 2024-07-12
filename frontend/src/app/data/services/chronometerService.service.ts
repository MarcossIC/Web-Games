import { Injectable, signal } from '@angular/core';
import { GameName } from '../models/GameName.enum';

@Injectable({
  providedIn: 'root',
})
export class ChronometerServiceService {
  private _gameOver = signal(false);
  private _isPaused = signal(true);
  private _gameType = signal<GameName>(GameName.NONE);
  private _minutes = signal(0);

  constructor() {}

  public reset() {
    this.gameOver = false;
    this.isPaused = false;
  }

  public updateGameName(gameName: GameName) {
    this.gameType = gameName;
  }

  get gameOver(): boolean {
    return this._gameOver.asReadonly()();
  }

  set gameOver(value: boolean) {
    this._gameOver.set(value);
  }

  get isPaused(): boolean {
    return this._isPaused.asReadonly()();
  }

  set isPaused(value: boolean) {
    this._isPaused.set(value);
  }

  get gameType(): GameName {
    return this._gameType();
  }

  set gameType(value: GameName) {
    this._gameType.set(value);
  }

  get minutes(): number {
    return this._minutes();
  }

  set minutes(value: number) {
    this._minutes.set(value);
  }
}
