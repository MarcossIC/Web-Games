import { Injectable, inject } from '@angular/core';
import { PieceService } from './Piece.service';
import { Piece } from '@app/data/models/tetris/Piece';
import { PieceType } from '@app/data/models/tetris/PieceType.enum';
import { ACTION } from '@app/data/models/tetris/MoveDirections.enum';
import { ramdomNumber } from '../util.service';
import { BoardSizeService } from '@app/data/services/BoardSize.service';

@Injectable()
export class BagOfPiecesService {
  pieceBag: Piece[] = [];
  allPieceType: PieceType[];
  private boardSize = inject(BoardSizeService);

  public piece = inject(PieceService);

  constructor() {
    this.boardSize.typeToTetris();
    this.allPieceType = this.loadAllPieceType();
    this.loadPieceBag();
    this.recoverNextPiece();
  }

  private loadAllPieceType(): PieceType[] {
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

  public generatePiece(pieceType: PieceType): Piece {
    const shape = this.piece.generateShapePiece(pieceType);
    let ramsomPositionX = ramdomNumber(true, this.boardSize.WIDTH - 1);

    if (ramsomPositionX <= 0) ramsomPositionX += 2;
    if (ramsomPositionX + shape.length > this.boardSize.WIDTH - 1)
      ramsomPositionX -= 2;

    return {
      shape: shape,
      type: pieceType,
      isMovable: true,
      color: this.piece.defineColorPiece(),
      position: { x: ramsomPositionX, y: 0 },
    };
  }

  private loadPieceBag(): void {
    const totalPiece = this.allPieceType.length;
    for (let i = 0; i < totalPiece; i++) {
      this.addPieceToBag();
    }

    this.allPieceType = this.loadAllPieceType();
  }

  public addPieceToBag(): void {
    this.pieceBag.push(this.generatePiece(this.ramdomPieceType));
  }

  public reset(): void {
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
  public recoverNextPiece(): void {
    const numberPieceInBag = this.numberPieceInBag;
    if (numberPieceInBag >= 1) {
      this.updateCurrent();
    }
    if (numberPieceInBag === 1) {
      this.loadPieceBag();
    }
  }

  public updateCurrent(): void {
    const nextPiece = this.pieceBag.pop();
    if (nextPiece !== undefined) {
      this.piece.current = nextPiece;
    }
  }

  public nextPiece(): Piece {
    const next = this.pieceBag.pop() as Piece;
    this.pieceBag.push(next);
    return next;
  }

  public get ramdomPieceType(): PieceType {
    return this.allPieceType.splice(
      ramdomNumber(true, this.allPieceType.length - 1),
      1
    )[0];
  }

  //Verifica si la bolsa esta vacia
  public get bagIsEmpty(): boolean {
    return this.pieceBag.length <= 1;
  }

  private get numberPieceInBag(): number {
    return this.pieceBag.length;
  }
}
