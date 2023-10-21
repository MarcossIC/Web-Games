import { Injectable } from '@angular/core';
import { fillMatrix } from '../util.service';
import { Player } from '@app/data/models/tictactoe/Player.enum';
import { GameStatus } from '@app/data/models/tictactoe/GameStatus.enum';
import { PartyStatus } from '@app/data/models/tictactoe/PartyStatus.enum';

@Injectable({
  providedIn: 'root'
})
export class GameStateService {

  public board: string[][];
  public turn: Player;
  public gameStatus: GameStatus;
  public partyStatus: PartyStatus;


  constructor() { 
    this.board = this.emptyBoard();
    this.turn = Player.X;
    this.gameStatus = GameStatus.WAITING;
    this.partyStatus = PartyStatus.BEGGING;
  }
  resetGameState(){
    this.board = this.emptyBoard();
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

  getBoard(){
    return this.board;
  }

  public updateBoard(rowX: number, cellY: number): void {
    if(this.board[rowX][cellY] === '0'){
      this.board[rowX][cellY] = this.turn === Player.X ? 'X' : 'O';
    }

    console.log('board-post-up: ',this.board);
    
  }
  
  private countEmptyCell(): number {
    return this.board.flat().filter(cell => cell === '0').length;
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

  public isEndGame(): boolean{
    const BOARD = this.board;

    const anyRowComple = this.checkBoardRows(BOARD);
    if(anyRowComple) return true;

    const anyColumnsComplete = this.checkBoardColumns(BOARD);
    if(anyColumnsComplete) return true;

    const anyDiagonalComplete = this.checkBoardDiagonals(BOARD);
    if(anyDiagonalComplete) return true;

    const countEmptyCell = this.countEmptyCell();
    if(countEmptyCell === 0) {
      this.gameStatus = GameStatus.DRAW;
      return true;
    }

    return false;
  }
}
