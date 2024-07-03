import { Injectable, inject } from '@angular/core';
import { fillMatrix } from '../util.service';
import { Player } from '@app/data/models/tictactoe/Player.enum';
import { GameStatus } from '@app/data/models/tictactoe/GameStatus.enum';
import { PartyStatus } from '@app/data/models/tictactoe/PartyStatus.enum';
import { BoardStateService } from './BoardStateService.service';

@Injectable({
  providedIn: 'root',
})
export class GameStateService {
  private _board: string[][];
  public turn: Player;
  public gameStatus: GameStatus;
  public partyStatus: PartyStatus;
  private boardStateService: BoardStateService = inject(BoardStateService);

  constructor() {
    this._board = this.emptyBoard();
    this.turn = Player.X;
    this.gameStatus = GameStatus.WAITING;
    this.partyStatus = PartyStatus.BEGGING;
  }
  public resetGameState(): void {
    this._board = this.emptyBoard();
    this.turn = Player.X;
    this.gameStatus = GameStatus.WAITING;
    this.partyStatus = PartyStatus.BEGGING;
  }

  public emptyBoard(): string[][] {
    return fillMatrix(3, 3, '0') as string[][];
  }

  public advanceTurn(): void {
    this.turn = this.turn === Player.X ? Player.O : Player.X;
  }

  public getBoard(): string[][] {
    return this._board;
  }

  public updateBoard(rowX: number, cellY: number): void {
    if (this._board[rowX][cellY] === '0') {
      this._board[rowX][cellY] = this.turn === Player.X ? 'X' : 'O';
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
    const BOARD = this._board;
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
}
