import { Injectable } from '@angular/core';
import { Piece } from '@app/data/models/tetris/Piece';
import { PieceColor } from '@app/data/models/tetris/PieceColor';
import { PieceImage } from '@app/data/models/tetris/PieceImage';
import { PieceType } from '@app/data/models/tetris/PieceType.enum';
import { ALL_COLOR_PIECE, ALL_SQUARE_IMG, BOARD_HEIGHT, BOARD_HEIGHT_SCREEN, BOARD_WIDTH, BOARD_WIDTH_SCREEN, ramdomNumber } from '@app/presentation/pages/tetris/tetrisConstanst';

@Injectable({
  providedIn: 'root'
})
export class PieceService {
  //Mapa que: relaciona un tipo de pieza con su funcion
  private allPieces: Record<PieceType, () => number[][]> = {
    [PieceType.SQUARE]: this.generateSquare.bind(this),
    [PieceType.BAR]: this.generateBar.bind(this),
    [PieceType.TRIANGLE]: this.generateTriangle.bind(this),
    [PieceType.STAIRCASE]: this.generateStaircase.bind(this),
    [PieceType.ELE]: this.generateEle.bind(this),
    [PieceType.INVERTED_STAIRCASE]: this.generateInvertedStaircase.bind(this),
    [PieceType.INVERTED_ELE]: this.generateInvertedEle.bind(this)
  };

  private _current: Piece;

  constructor() { 
    this._current = {shape: [[]], type: PieceType.SQUARE, position: {x: 0, y: 0}, color: {fill: "", stroke: ""}, isMovable: true};
  }

  get current(): Piece{
    return this._current;
  }
  set current(updatePiece: Piece){
    this._current = updatePiece;
  }

  moveToLeft(){
      this._current.position.x--;
  }

  moveToRight(){
      this._current.position.x++;
  }

  moveToDown(){
      this._current.position.y++;
  }

  solidify(){
    this._current.isMovable = false;
    this._current.position.x = 5;
    this._current.position.y = 2;
  }

  public generateShapePiece(pieceType: PieceType): number[][] {
    //Crea la forma de una pieza segun el tipo
    return this.allPieces[pieceType]();
  }

  public defineColorPiece(): PieceColor{
    const colorIndex = ramdomNumber(false, 7);
    //Retorna una color ramdom de entre la paleta de colores definida
    return ALL_COLOR_PIECE[colorIndex];
  }

  private generateSquare(): number[][]{
    return [ 
      [1]
     ];
  }

  private generateBar(): number[][]{
    return [
      [1, 1, 1]
    ];
  }

  private generateTriangle(): number[][]{
    return [
      [0, 1, 0],
      [1, 1, 1]
    ];
  }

  private generateEle(): number[][] {
    return [
      [1, 0],
      [1, 0],
      [1, 1]
    ];
  }

  private generateInvertedEle(): number[][]{
    return [
      [0, 1],
      [0, 1],
      [1, 1]
    ];
  }

  private generateStaircase(): number[][]{
    return [
      [0, 1],
      [1, 1]
    ];
  }

  private generateInvertedStaircase(): number[][]{
    return [
      [1, 0],
      [1, 1]
    ];
  }

}
