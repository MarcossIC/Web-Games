import { Injectable, inject, signal } from '@angular/core';
import { fillMatrix } from '../util.service';
import { Player } from '@app/data/models/tictactoe/Player.enum';
import { GameStatus } from '@app/data/models/tictactoe/GameStatus.enum';
import { PartyStatus } from '@app/data/models/tictactoe/PartyStatus.enum';
import { BoardStateService } from './BoardStateService.service';

@Injectable()
export class GameStateService {
  private _board = signal(this.emptyBoard());
  public turn: Player;
  private _gameStatus = signal(GameStatus.WAITING);
  private _partyStatus = signal(PartyStatus.BEGGING);
  private boardStateService = inject(BoardStateService);

  constructor() {
    this.turn = Player.X;
  }
  public resetGameState(): void {
    this._board.set(this.emptyBoard());
    this.turn = Player.X;
    this._gameStatus.set(GameStatus.WAITING);
    this._partyStatus.set(PartyStatus.BEGGING);
  }

  public emptyBoard(): string[][] {
    return fillMatrix(3, 3, '0') as string[][];
  }

  public advanceTurn(): void {
    this.turn = this.turn === Player.X ? Player.O : Player.X;
  }

  public getBoard(): string[][] {
    return this._board();
  }

  public updateBoard(rowX: number, cellY: number): void {
    const currentBoard = this._board();
    if (currentBoard[rowX][cellY] === '0') {
      currentBoard[rowX][cellY] = this.turn === Player.X ? 'X' : 'O';
      this._board.set([...currentBoard]);
    }
  }

  /**
   * Determina si el juego ha terminado.
   *
   * Esta función verifica si el juego ha llegado a su fin, ya sea porque hay un ganador
   * o porque el tablero está completamente lleno (empate).
   *
   * @public
   * @returns {boolean} Retorna true si el juego ha terminado, false en caso contrario.
   */
  public isEndGame(): boolean {
    const BOARD = this._board();
    const emptyCellCount = this.boardStateService.countEmptyCell(BOARD);
    // Verificar si hay un ganador
    const isAWinner = this.boardStateService.checkBoardForWinner(BOARD);
    // Si hay un ganador, actualizar el estado del juego y terminar
    if (isAWinner) {
      this.gameStatus = this.boardStateService.gameResult;
      return true;
    }

    // Si no hay celdas vacías, es un empate
    if (emptyCellCount === 0) {
      this.gameStatus = GameStatus.DRAW;
      return true;
    }

    // Si no se cumplen las condiciones anteriores, el juego continúa
    return false;
  }

  public get gameStatus() {
    return this._gameStatus();
  }
  public set gameStatus(updated: GameStatus) {
    this._gameStatus.set(updated);
  }
  public get partyStatus() {
    return this._partyStatus();
  }
  public set partyStatus(updated: PartyStatus) {
    this._partyStatus.set(updated);
  }
}
