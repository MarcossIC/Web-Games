import { Injectable } from '@angular/core';
import { Player } from '@app/data/models/tictactoe/Player.enum';

@Injectable()
export class UserPlayerService {
  private player: Player;
  private countWins: number;

  constructor() {
    this.player = Player.X;
    this.countWins = 0;
  }

  public win(): void {
    this.countWins++;
  }

  public getCountWins(): number {
    return this.countWins;
  }

  public reset(): void {
    this.player = Player.X;
    this.countWins = 0;
  }

  public changePlayer(updatePlayer: Player): void {
    this.player = updatePlayer;
  }

  public getPlayer(): Player {
    return this.player;
  }
}
