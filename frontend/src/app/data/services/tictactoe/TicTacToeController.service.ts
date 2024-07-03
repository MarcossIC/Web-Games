import { Injectable, inject } from '@angular/core';
import { GameStateService } from './GameState.service';
import { SecondPlayerService } from './SecondPlayer.service';
import { UserPlayerService } from './UserPlayer.service';
import { Player } from '@app/data/models/tictactoe/Player.enum';
import { GameStatus } from '@app/data/models/tictactoe/GameStatus.enum';
import { PartyStatus } from '@app/data/models/tictactoe/PartyStatus.enum';
import { BotLevel } from '@app/data/models/tictactoe/BotLevel.enum';
import {
  arrayToMatrix,
  calcArrayPositionToMatrixCords,
  findEmptyBoardCells,
} from '../util.service';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
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
   * Realiza un movimiento para el jugador bot (IA) según su nivel de dificultad.
   * Esta función determina la mejor jugada para el bot basándose en su nivel (ROCKIE, NOVICE o MASTER)
   * y luego ejecuta el movimiento en el tablero.
   *
   * @public
   * @returns {void}
   */
  public playBot(): void {
    // Obtener el estado actual del tablero y convertirlo a una matriz 3x3
    const currentBoard = arrayToMatrix(this.gameState.getBoard().flat(), 3, 3);
    // Obtener las posiciones vacías actuales en el tablero
    const currentPositions = findEmptyBoardCells(this.gameState.getBoard());
    // Obtener el turno actual
    const currentTurn = this.gameState.turn;

    // Mapeo de niveles de bot a sus respectivas funciones
    const botMoves = {
      [BotLevel.ROCKIE]: this.secondPlayer.takeABlindMove,
      [BotLevel.NOVICE]: this.secondPlayer.takeANoviceMove,
      [BotLevel.MASTER]: this.secondPlayer.takeAMasterMove,
    };

    // Obtener la función de movimiento correspondiente al nivel del bot
    const moveFunction = botMoves[this.secondPlayer.botAI];
    // Calcular la posición del movimiento
    const { x, y } = this.calculateBotMove(
      moveFunction,
      currentBoard,
      currentPositions,
      currentTurn
    );
    let rowX = y;
    let cellY = x;

    this.play(rowX, cellY);
  }

  /**
   * Calcula la posición del movimiento del bot.
   * @private
   * @param {Function} moveFunction - La función de movimiento correspondiente al nivel del bot.
   * @param {string[][]} board - El tablero actual.
   * @param {number[]} emptyPositions - Las posiciones vacías en el tablero.
   * @param {Player} turn - El turno actual.
   * @returns {{x: number, y: number}} - Las coordenadas del movimiento.
   */
  private calculateBotMove(
    moveFunction: Function,
    board: string[][],
    emptyPositions: number[],
    turn: Player
  ): { x: number; y: number } {
    const positionSelected = moveFunction.call(this.secondPlayer, {
      boardScreen: board,
      emptyCells: emptyPositions,
      turn: turn,
    });
    return calcArrayPositionToMatrixCords(positionSelected, 3, 3);
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
