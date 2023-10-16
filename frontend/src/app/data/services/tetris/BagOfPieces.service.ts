import { Injectable, inject } from '@angular/core';
import { PieceService } from './Piece.service';
import { Piece } from '@app/data/models/tetris/Piece';
import { PieceType } from '@app/data/models/tetris/PieceType.enum';
import {
  BOARD_WIDTH,
  BOARD_WIDTH_SCREEN,
  ramdomNumber,
} from '@app/presentation/pages/tetris/tetrisConstanst';
import { ACTION } from '@app/data/models/tetris/MoveDirections.enum';

@Injectable({
  providedIn: 'root',
})
export class BagOfPiecesService {
  pieceBag: Piece[] = [];
  allPieceType: PieceType[];
  
  public piece = inject(PieceService);

  constructor() {
    this.allPieceType = this.loadPieceType();
    this.loadPieceBag();
    this.recoverNextPiece();
  }

  //Recupero una tipo ramdom y lo elimina del array
  get ramdomPieceType(): PieceType {
    return this.allPieceType.splice(
      ramdomNumber(true, this.allPieceType.length-1),
      1
    )[0];
  }

  private loadPieceType() {
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

  //Carga la bolsa de piezas de manera aleatoria
  loadPieceBag(): void {
    this.pieceBag.push(this.generatePiece(this.ramdomPieceType));
    this.pieceBag.push(this.generatePiece(this.ramdomPieceType));
    this.pieceBag.push(this.generatePiece(this.ramdomPieceType));
    this.pieceBag.push(this.generatePiece(this.ramdomPieceType));
    this.pieceBag.push(this.generatePiece(this.ramdomPieceType));
    this.pieceBag.push(this.generatePiece(this.ramdomPieceType));
    this.pieceBag.push(this.generatePiece(this.ramdomPieceType));

    this.allPieceType = this.loadPieceType();
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

  //"Saca" una pieza de la bolsa
  recoverNextPiece(): void {
    if (!this.bagIsEmpty) {
      this.updateCurrent();
    } else {
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
