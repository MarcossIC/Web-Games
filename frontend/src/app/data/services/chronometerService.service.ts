import { DestroyRef, Injectable, inject } from '@angular/core';
import { ChronometerUpdated } from '../models/ChronometerUpdated';
import { Subject } from 'rxjs';
import { GameName } from '../models/GameName.enum';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class ChronometerServiceService {
  public gameOver: boolean;
  public isPaused: boolean;
  public gameType: GameName;
  public updated: Subject<ChronometerUpdated> = new Subject();
  public minutes: number;
  private destroy = inject(DestroyRef);

  constructor() {
    this.gameOver = false;
    this.isPaused = true;
    this.gameType = GameName.NONE;
    this.minutes = 0;

    this.updated.pipe(takeUntilDestroyed(this.destroy)).subscribe((obj) => {
      this.gameOver = obj.gameOver;
      this.isPaused = obj.isPaused;
    });
  }

  public reset() {
    this.gameOver = false;
    this.isPaused = false;
  }

  public updateGameName(gameName: GameName) {
    this.gameType = gameName;
  }
}
