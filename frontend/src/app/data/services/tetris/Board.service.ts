import { Injectable } from '@angular/core';
import { BOARD_WIDTH, BOARD_HEIGHT, DEFAULT_COLOR, BOARD_HEIGHT_SCREEN, BOARD_WIDTH_SCREEN } from "../../../presentation/pages/tetris/tetrisConstanst";
import { Piece } from '@app/data/models/tetris/Piece';
import { PointsService } from './Points.service';

@Injectable({
  providedIn: 'root'
})
export class BoardService {

  private _board: number[][];
  constructor(private points: PointsService) { 
    this._board = this.loadBoard(BOARD_WIDTH_SCREEN, BOARD_HEIGHT_SCREEN);
  }

  loadBoard(boardWidth: number, boardHeight: number): number[][]{
    return Array(boardHeight).fill(0).map(() => Array(boardWidth).fill(0));
  }
  //Exponer el tablero
  get board(){
    return this._board;
  }

  //Rieniciar el tablero
  reset(){
    this._board = this.loadBoard(BOARD_WIDTH_SCREEN, BOARD_HEIGHT_SCREEN);
  }

  drawBoard(
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);

    this._board.forEach((row, x) => {
      row.forEach((value, y) => {
        if (value === 1) {
          //Configuracion
          context.fillStyle = DEFAULT_COLOR.fill;
          context.strokeStyle = DEFAULT_COLOR.stroke;

          //Variables para, dibujar el cuadrado
          context.fillRect(y, x, 1, 1);
          context.strokeRect(y, x, 1, 1);
        }
      });
    });
  }



  solidifyPieceInBoard(piece: Piece){
    piece.shape.forEach((row, x) => {
      row.forEach((value, y) => {
        if (value === 1) {
          this._board[y+piece.position.y+1][x + piece.position.x] = 1;
        }
      })
    })
  }

  verifyLines(){
    this._board.forEach((row, rowX)=>{
      if(row.every(cell => cell !== 0)){
        this.removeLine(rowX);
        this.addNewEmptyLine();
        this.points.updatePoints();
      }
    });
  }

  removeLine(line: number){
    this._board.splice(line, 1);
    this._board.unshift(Array(BOARD_WIDTH).fill(0));
  }

  addNewEmptyLine(){
    this._board.unshift(Array(BOARD_WIDTH).fill(0));
  }
  

}
