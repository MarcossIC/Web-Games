import { Injectable } from '@angular/core';
import { EndGameResult } from '@app/data/models/tictactoe/EndGameResult';
import { GameStatus } from '@app/data/models/tictactoe/GameStatus.enum';
import { Player } from '@app/data/models/tictactoe/Player.enum';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BoardStateService {
  public updateGameState: Subject<GameStatus> = new Subject<GameStatus>();

  private gameStatus: GameStatus;
  constructor() { 
    this.gameStatus = GameStatus.WAITING;
  }

  get gameResult(){
    return this.gameStatus;
  }
  public countEmptyCell(board: string[][]): number {
    return board.flat().filter(cell => cell === '0').length;
  }

  private checkBoardRows(board: string[][]): boolean {
    const boardLength = board.length;
    for(let rowIndex = 0; rowIndex < boardLength; rowIndex++){
      if(board[rowIndex].every(cell => cell === 'X')){
        this.gameStatus = GameStatus.X_WON;
        return true;
      }
      if(board[rowIndex].every(cell => cell === 'O')){
        this.gameStatus = GameStatus.O_WON;
        return true;
      }
    }
    return false;
  }

  private checkBoardColumns(board: string[][]): boolean {
    const boardLength = board.length;
    for (let columnIndex = 0; columnIndex < boardLength; columnIndex++) {
      let countXColumns = 0;
      let countOColumns = 0;
      for (let rowIndex = 0; rowIndex < boardLength; rowIndex++) {
        if (board[rowIndex][columnIndex] === 'X') countXColumns++;
        else if (board[rowIndex][columnIndex] === 'O') countOColumns++;
      }
      if (countXColumns === boardLength) {
        this.gameStatus = GameStatus.X_WON;
        return true;
      }
      if (countOColumns === boardLength) {
        this.gameStatus = GameStatus.O_WON;
        return true;
      }
    }
    return false;
  }

  private checkBoardDiagonals(board: string[][]): boolean {
    const boardLength = board.length;
    let countXDiagonal1 = 0;
    let countODiagonal1 = 0;
    let countXDiagonal2 = 0;
    let countODiagonal2 = 0;

    for (let i = 0; i < boardLength; i++) {
      if (board[i][i] === 'X') countXDiagonal1++;
      else if (board[i][i] === 'O') countODiagonal1++;
      
      if (board[i][boardLength - 1 - i] === 'X') countXDiagonal2++;
      else if (board[i][boardLength - 1 - i] === 'O') countODiagonal2++; 
    }

    if(countXDiagonal1 === 3 || countXDiagonal2 === 3){
      this.gameStatus = GameStatus.X_WON;
      return true;
    }
    if(countODiagonal1 === 3 || countODiagonal2 === 3){
      this.gameStatus = GameStatus.O_WON;
      return true;
    }
    
    return false;
  }

  public checkBoard(board: string[][]): boolean{
    return this.checkBoardColumns(board) || this.checkBoardDiagonals(board) || this.checkBoardRows(board);
  }

  public evaluate(board: string[][], player: Player): number {
    let score = 0;
    const emptyCellCount = this.countEmptyCell(board);
    const isAWinner = this.checkBoard(board);

    if(isAWinner) {
      const isCurrentPlayerWinner = (player === Player.X && this.gameStatus === GameStatus.X_WON) || (player === Player.O && this.gameStatus === GameStatus.O_WON);
      score = isCurrentPlayerWinner ? 10 : -10;

      return score;
    }
    
    if(emptyCellCount === 0) {
      this.gameStatus = GameStatus.DRAW;
      return 0;
    }
    return 1000;
  }
}
