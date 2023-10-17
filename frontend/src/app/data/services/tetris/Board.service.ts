import { Injectable } from '@angular/core';
import { BOARD_HEIGHT_SCREEN, BOARD_WIDTH_SCREEN, DEFAULT_COLOR, SIZE_SQUARE_IN_BOARD } from "../../../../assets/constants/tetrisConstanst";
import { Piece } from '@app/data/models/tetris/Piece';
import { PointsService } from './Points.service';
import { fillArray, fillMatrix, ramdomNumber } from '../util.service';

@Injectable({
  providedIn: 'root'
})
export class BoardService {
  private _board: number[][];

  constructor(private points: PointsService) { 
    this._board = fillMatrix(BOARD_WIDTH_SCREEN, BOARD_HEIGHT_SCREEN, 0);
  }

  //Exponer el tablero
  get board(){
    return this._board;
  }

  //Rieniciar el tablero
  reset(){
    this._board = fillMatrix(BOARD_WIDTH_SCREEN, BOARD_HEIGHT_SCREEN, 0);
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
        if (value > 0) {
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
        if (value > 0) this._board[y+piece.position.y][x + piece.position.x] = 1;
      })
    })
  }

  verifyLines(): number {
    this._board.forEach((row, rowX)=>{
      if(row.every(cell => cell > 0)){
        this.removeLine(rowX);
        this.addNewEmptyLine();
        this.points.addScore();
      }
    });
    let score = this.points.score;
    let level;
    if(score < 500) level = 1;
    else if(score >= 500 && score < 1000) level =  2;
    else if(score >= 1000 && score < 1500) level =  3;
    else level =  4;
    this.points.updateLevel(level);
    this.points.updateMaxPoints();
    return level;
  }

  removeLine(line: number){
    this._board.splice(line, 1);
    this._board.unshift(fillArray(BOARD_WIDTH_SCREEN, 0));
  }

  addNewEmptyLine(){
    this._board.unshift(fillArray(BOARD_WIDTH_SCREEN, 0));
  }
}
