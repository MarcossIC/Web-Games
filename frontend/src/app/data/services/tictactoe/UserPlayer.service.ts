import { Injectable } from '@angular/core';
import { Player } from '@app/data/models/tictactoe/Player.enum';

@Injectable({
  providedIn: 'root'
})
export class UserPlayerService {
  private player: Player;
  private countWins: number;


  constructor() { 
    this.player = Player.X;
    this.countWins = 0;
  }

  win(){
    this.countWins++;
  }
  
  getCountWins(){
    return this.countWins;
  }

  reset(){
    this.player = Player.X;
    this.countWins = 0;
  } 


  changePlayer(updatePlayer: Player) {
    this.player = updatePlayer;
  }

  getPlayer(): Player {
    return this.player;
  }
}
