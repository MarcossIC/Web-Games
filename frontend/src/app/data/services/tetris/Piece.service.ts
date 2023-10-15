import { Injectable } from '@angular/core';
import { Piece } from '@app/data/models/tetris/Piece';
import { PieceColor } from '@app/data/models/tetris/PieceColor';
import { PieceType } from '@app/data/models/tetris/PieceType.enum';
import { BOARD_HEIGHT, BOARD_HEIGHT_SCREEN, BOARD_WIDTH, BOARD_WIDTH_SCREEN } from '@app/presentation/pages/tetris/tetrisConstanst';

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
  //Mapa que: Define la paleta de coloresde las piezas
  private allColorPiece: Record<number, PieceColor> = {
    1: {fill: "#FEEA67", stroke: "#6E5E20"},
    2: {fill: "#79FEFF", stroke: "#40666E"},
    3: {fill: "#FC7382", stroke: "#6E3D42"},
    4: {fill: "#6FFC73", stroke: "#345C3D"},
    5: {fill: "#6699FE", stroke: "#384066"},
    6: {fill: "#E99D2A", stroke: "#A06A34"},
    7: {fill: "#9257C8", stroke: "#38294A"}
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
    const number = Math.floor(Math.random() * 7) + 1;
    //Retorna una color ramdom de entre la paleta de colores definida
    return this.allColorPiece[number];
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
