import { Injectable, inject } from '@angular/core';
import { PieceService } from './Piece.service';
import { Piece } from '@app/data/models/tetris/Piece';
import { PieceType } from '@app/data/models/tetris/PieceType.enum';
import {
  BOARD_WIDTH_SCREEN
} from 'assets/constants/tetrisConstanst';
import { ACTION } from '@app/data/models/tetris/MoveDirections.enum';
import { ramdomNumber } from '../util.service';

@Injectable({
  providedIn: 'root',
})
export class BagOfPiecesService {
  pieceBag: Piece[] = [];
  allPieceType: PieceType[];
  
  public piece = inject(PieceService);

  constructor() {
    this.allPieceType = this.loadAllPieceType();
    this.loadPieceBag();
    this.recoverNextPiece();
  }

  loadAllPieceType(): PieceType[] {
    return [
      PieceType.BAR,
      PieceType.ELE,
      PieceType.SQUARE,
      PieceType.TRIANGLE,
      PieceType.STAIRCASE,
      PieceType.INVERTED_ELE,
      PieceType.INVERTED_STAIRCASE,
    ];
  }

  //Recupero una tipo ramdom y lo elimina del array
  get ramdomPieceType(): PieceType {
    return this.allPieceType.splice(
      ramdomNumber(true, this.allPieceType.length-1),
      1
    )[0];
  }

  //Carga la bolsa de piezas de manera aleatoria
  loadPieceBag(): void {
    const totalPiece = this.allPieceType.length;
    console.log("total is: "+totalPiece);
    for(let i = 0; i < totalPiece; i++) {
      console.log("i: "+i+" total: "+totalPiece);
      this.addPieceToBag();
    }

    this.allPieceType = this.loadAllPieceType();
  }

  addPieceToBag(){
    this.pieceBag.push(this.generatePiece(this.ramdomPieceType));
  }

  reset() {
    const lenght = this.pieceBag.length;
    for (let i = 0; i < lenght; i++) {
      this.pieceBag.pop();
    }
    this.loadPieceBag();
    this.recoverNextPiece();
  }

  public movePiece(direction: ACTION): void {
    if (direction === ACTION.LEFT) {
      this.piece.moveToLeft();
    } else if (direction === ACTION.RIGHT) {
      this.piece.moveToRight();
    } else if (direction === ACTION.DOWN) {
      this.piece.moveToDown();
    }
  }

  //Recupera la siguiente pieza, si no esta vacia la bolsa
  recoverNextPiece(): void {
    const isEmpty = this.bagIsEmpty;
    if (!isEmpty) {
      this.updateCurrent();
    } 
    if(isEmpty){
      this.loadPieceBag();
      this.updateCurrent();
    }
  }

  updateCurrent() {
    const nextPiece = this.pieceBag.pop();
    if (nextPiece !== undefined) {
      this.piece.current = nextPiece;
    }
  }

  nextPiece(): Piece {
    const next = this.pieceBag.pop() as Piece;
    this.pieceBag.push(next);
    return next;
  }

  //Verifica si la bolsa esta vacia
  get bagIsEmpty(): boolean {
    return this.pieceBag.length <= 1;
  }

  generatePiece(pieceType: PieceType): Piece {
    const shape = this.piece.generateShapePiece(pieceType);
    let ramsomPositionX = ramdomNumber(true, BOARD_WIDTH_SCREEN-1);

    if (ramsomPositionX <= 0) ramsomPositionX += 2;
    if (ramsomPositionX + shape.length > BOARD_WIDTH_SCREEN - 1) ramsomPositionX -= 2;

    return {
      shape: shape,
      type: pieceType,
      isMovable: true,
      color: this.piece.defineColorPiece(),
      position: { x: ramsomPositionX, y: 0 }
    };
  }
}
