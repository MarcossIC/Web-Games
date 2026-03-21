import { Injectable } from '@angular/core';
import { Piece } from '@app/data/models/tetris/Piece';
import {
  NEXT_PIECE_HEIGHT,
  NEXT_PIECE_WIDTH,
  FULL_SQUARE_SIZE,
} from 'assets/constants/tetrisConstanst';
import { fillMatrix } from '../util.service';

@Injectable()
export class NextPieceBoardService {
  nextPiece!: Piece;
  nextPieceBoard: number[][];

  constructor() {
    this.nextPieceBoard = fillMatrix(
      NEXT_PIECE_HEIGHT,
      NEXT_PIECE_WIDTH,
      0
    ) as number[][];
  }

  public reset(): void {
    this.nextPieceBoard = fillMatrix(
      NEXT_PIECE_HEIGHT,
      NEXT_PIECE_WIDTH,
      0
    ) as number[][];
  }

  public drawNextPiece(
    context: CanvasRenderingContext2D,
    nextPiece: Piece
  ): void {
    context.fillStyle = nextPiece.color.fill;
    context.strokeStyle = nextPiece.color.stroke;

    const shape = nextPiece.shape;
    const offsetX = (NEXT_PIECE_WIDTH - shape.length) / 2;
    const offsetY = (NEXT_PIECE_HEIGHT - shape[0].length) / 2;

    shape.forEach((row, x) => {
      row.forEach((value, y) => {
        if (value > 0) {
          const drawX = offsetX + x;
          const drawY = offsetY + y;
          context.fillRect(drawX, drawY, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
          context.strokeRect(drawX, drawY, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
        }
      });
    });
  }
}
