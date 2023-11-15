import { Injectable } from '@angular/core';
import { ChronometerUpdated } from '../models/ChronometerUpdated';
import { Subject } from 'rxjs';
import { GameName } from '../models/GameName.enum';

@Injectable({
  providedIn: 'root'
})
export class ChronometerServiceService {
  public gameOver: boolean;
  public isPaused: boolean;
  public gameType: GameName;
  public updated: Subject<ChronometerUpdated>;
  public minutes: number;

  constructor() {
    this.gameOver = false;
    this.isPaused = true;
    this.updated  = new Subject();
    this.gameType = GameName.NONE;
    this.minutes  = 0;
  }


  public reset(){
    this.gameOver = false;
    this.isPaused = false;
  }

  public updateGameName(gameName: GameName){
    this.gameType = gameName;
  }

}
