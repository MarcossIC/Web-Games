import { Injectable, inject } from '@angular/core';
import { GameStateService } from './GameState.service';
import { SecondPlayerService } from './SecondPlayer.service';
import { UserPlayerService } from './UserPlayer.service';
import { Player } from '@app/data/models/tictactoe/Player.enum';
import { GameStatus } from '@app/data/models/tictactoe/GameStatus.enum';
import { PartyStatus } from '@app/data/models/tictactoe/PartyStatus.enum';
import { BotLevel } from '@app/data/models/tictactoe/BotLevel.enum';
import { Subject } from 'rxjs';

@Injectable()
export class TicTacToeControllerService {
  private gameState: GameStateService = inject(GameStateService);
  private secondPlayer: SecondPlayerService = inject(SecondPlayerService);
  private userPlayer: UserPlayerService = inject(UserPlayerService);
  public _notifyBot: Subject<boolean> = new Subject<boolean>();

  constructor() {}

  public reset(): void {
    this.gameState.resetGameState();
    this.userPlayer.reset();
    this.secondPlayer.reset();
  }

  public playAgain(): void {
    this.gameState.resetGameState();
  }

  public initGame(): void {
    this.gameState.gameStatus = GameStatus.PLAYING;
    this.gameState.partyStatus = PartyStatus.RUNNING;
    if (this.secondPlayer.isBotPlaying && !this.isTheMainPlayerTurn()) {
      this.notifyBot();
    }
  }

  public runGame(rowX: number, cellY: number): void {
    if (this.partyIsRunning()) {
      if (this.secondPlayer.isBotPlaying) {
        this.isTurnForUserPlayer() && this.play(rowX, cellY);
      }

      if (!this.secondPlayer.isBotPlaying) this.play(rowX, cellY);
    }
  }

  private isTurnForUserPlayer(): boolean {
    return this.gameState.turn === this.userPlayer.getPlayer();
  }
  private play(rowX: number, cellY: number) {
    this.gameState.updateBoard(rowX, cellY);

    const isEndGame = this.gameState.isEndGame();

    if (!isEndGame) {
      this.gameState.advanceTurn();
      if (this.secondPlayer.isBotPlaying && !this.isTurnForUserPlayer()) {
        this.notifyBot();
      }
    }
    if (isEndGame) {
      this.verifyWinner();
      this.gameState.partyStatus = PartyStatus.ENDED;
    }
  }

  private notifyBot(): void {
    this._notifyBot.next(true);
  }

  /**
   * Realiza el movimiento del bot (IA) según su nivel de dificultad.
   *
   * El aviso al bot llega con retraso: si en ese tiempo la partida se
   * reinició o terminó, ya no es su turno y no juega.
   *
   * @public
   * @returns {void}
   */
  public playBot(): void {
    if (!this.partyIsRunning() || this.isTurnForUserPlayer()) return;

    const position = this.secondPlayer.chooseMove(this.gameState.getBoard());
    this.play(Math.floor(position / 3), position % 3);
  }

  /**
   * Verifica si hay un ganador en el juego actual y actualiza el estado de los jugadores en consecuencia.
   * Esta función comprueba todas las posibles condiciones de victoria y empate, y actualiza
   * el contador de victorias del jugador correspondiente.
   *
   * @private
   * @returns {void}
   */
  private verifyWinner(): void {
    // Verifica si el jugador principal (usuario) ha ganado
    if (
      (this.isOPlayerWinner() && this.mainPlayerPlaysWithO()) ||
      (this.isXPlayerWinner() && !this.mainPlayerPlaysWithO())
    )
      this.userPlayer.win();

    // Verifica si el segundo jugador (IA o segundo usuario) ha ganado
    if (
      (this.isXPlayerWinner() && this.mainPlayerPlaysWithO()) ||
      (this.isOPlayerWinner() && !this.mainPlayerPlaysWithO())
    )
      this.secondPlayer.win();

    // Verifica si hay un empate
    if (this.isDraw()) {
      // En caso de empate, se considera que ambos jugadores "ganan"
      this.secondPlayer.win();
      this.userPlayer.win();
    }
  }
  public get scorePlayerX(): number {
    return this.mainPlayerPlaysWithX()
      ? this.userPlayer.getCountWins()
      : this.secondPlayer.getCountWins();
  }

  public get scorePlayerO(): number {
    return this.mainPlayerPlaysWithO()
      ? this.userPlayer.getCountWins()
      : this.secondPlayer.getCountWins();
  }

  public retrieveBoard(): string[][] {
    return this.gameState.getBoard();
  }
  public updateMainPlayer(player: Player): void {
    this.userPlayer.changePlayer(player);
  }

  public updateSecondPlayer(player: Player): void {
    this.secondPlayer.changePlayer(player);
  }

  public isOccupied(rowX: number, cellY: number): boolean {
    return this.gameState.getBoard()[rowX][cellY] !== '0';
  }

  public changeBotState(): void {
    this.secondPlayer.isBotPlaying = !this.secondPlayer.isBotPlaying;
  }

  public updateBotLevel(botLevel: BotLevel): void {
    this.secondPlayer.changeBotLevel(botLevel);
  }

  public isMainPlayerWinner(status: GameStatus, player: Player): boolean {
    return (
      this.gameState.gameStatus === status &&
      this.userPlayer.getPlayer() === player
    );
  }

  public isXPlayerWinner(): boolean {
    return this.gameState.gameStatus === GameStatus.X_WON;
  }

  public isOPlayerWinner(): boolean {
    return this.gameState.gameStatus === GameStatus.O_WON;
  }

  public isDraw(): boolean {
    return this.gameState.gameStatus === GameStatus.DRAW;
  }

  public isPlayerXTurn(): boolean {
    return this.gameState.turn === Player.X;
  }

  public isTheMainPlayerTurn(): boolean {
    return this.userPlayer.getPlayer() === this.gameState.turn;
  }

  public isTheSecondPlayerTurn(): boolean {
    return this.secondPlayer.getPlayer() === this.gameState.turn;
  }

  public partyIsRunning(): boolean {
    return this.gameState.partyStatus === PartyStatus.RUNNING;
  }

  public partyIsEnded(): boolean {
    return this.gameState.partyStatus === PartyStatus.ENDED;
  }

  public partyIsBegging(): boolean {
    return this.gameState.partyStatus === PartyStatus.BEGGING;
  }

  public isBotPlaying(): boolean {
    return this.secondPlayer.isBotPlaying;
  }

  public mainPlayerPlaysWithO(): boolean {
    return this.userPlayer.getPlayer() === Player.O;
  }

  public mainPlayerPlaysWithX(): boolean {
    return this.userPlayer.getPlayer() === Player.X;
  }

  public botIsNovice(): boolean {
    return this.secondPlayer.botAI === BotLevel.NOVICE;
  }

  public botIsMaster(): boolean {
    return this.secondPlayer.botAI === BotLevel.MASTER;
  }

  public botIsRockie(): boolean {
    return this.secondPlayer.botAI === BotLevel.ROCKIE;
  }
}
