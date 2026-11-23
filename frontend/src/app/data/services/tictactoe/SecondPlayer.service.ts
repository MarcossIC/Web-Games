import { Injectable } from '@angular/core';
import { BotLevel } from '@app/data/models/tictactoe/BotLevel.enum';
import { Player } from '@app/data/models/tictactoe/Player.enum';
import { BOT_PROFILES, chooseBotMove } from './tictactoe-bot';

@Injectable()
export class SecondPlayerService {
  private player: Player;
  private _isBotPlaying: boolean;
  private countWins: number;
  private botLevel: BotLevel;

  constructor() {
    this.player = Player.O;
    this._isBotPlaying = false;
    this.countWins = 0;
    this.botLevel = BotLevel.ROCKIE;
  }

  public win(): void {
    this.countWins++;
  }

  public getCountWins(): number {
    return this.countWins;
  }

  public reset(): void {
    this.player = Player.O;
    this._isBotPlaying = false;
    this.countWins = 0;
    this.botLevel = BotLevel.ROCKIE;
  }

  /**
   * Elige la celda donde juega el bot según su nivel.
   *
   * @param board El tablero actual, fila por fila.
   * @returns La posición (0 a 8, fila por fila) donde el bot hará su movimiento.
   */
  public chooseMove(board: string[][]): number {
    return chooseBotMove(
      board.flat(),
      this.player === Player.X ? 'X' : 'O',
      BOT_PROFILES[this.botLevel]
    );
  }

  public changePlayer(updatePlayer: Player): void {
    this.player = updatePlayer;
  }

  public changeBotLevel(updateLevel: BotLevel): void {
    if (this._isBotPlaying) {
      this.botLevel = updateLevel;
    }
  }

  public getPlayer(): Player {
    return this.player;
  }

  public set isBotPlaying(value: boolean) {
    this._isBotPlaying = value;
  }

  public get botAI(): BotLevel {
    return this.botLevel;
  }
  public get isBotPlaying(): boolean {
    return this._isBotPlaying;
  }
}
