import { Injectable, inject } from '@angular/core';
import { fillMatrix } from '../util.service';
import { Player } from '@app/data/models/tictactoe/Player.enum';
import { GameStatus } from '@app/data/models/tictactoe/GameStatus.enum';
import { PartyStatus } from '@app/data/models/tictactoe/PartyStatus.enum';
import { BoardStateService } from './BoardStateService.service';

@Injectable({
  providedIn: 'root'
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
    if(this._board[rowX][cellY] === '0'){
      this._board[rowX][cellY] = this.turn === Player.X ? 'X' : 'O';
    }
    
  }

  public isEndGame(): boolean{
    const BOARD = this._board;
    const emptyCellCount = this.boardStateService.countEmptyCell(BOARD);
    const isAWinner = this.boardStateService.checkBoard(BOARD);
    if(isAWinner) {
      this.gameStatus = this.boardStateService.gameResult;
      return true;
    }
    if(emptyCellCount === 0) {
      this.gameStatus = GameStatus.DRAW;
      return true;
    }

    return false;
  }
}
