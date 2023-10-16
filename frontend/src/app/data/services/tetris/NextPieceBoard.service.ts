import { Injectable } from '@angular/core';
import { Piece } from '@app/data/models/tetris/Piece';
import { PieceType } from '@app/data/models/tetris/PieceType.enum';
import { NEXT_PIECE_HEIGHT, NEXT_PIECE_WIDTH, SIZE_SQUARE_IN_BOARD } from '@app/presentation/pages/tetris/tetrisConstanst';

@Injectable({
  providedIn: 'root'
})
export class NextPieceBoardService {

  nextPiece!: Piece;
  nextPieceBoard: number[][];


  
  constructor() {
    this.nextPieceBoard = this.loadBoard(NEXT_PIECE_HEIGHT, NEXT_PIECE_WIDTH);
  }

  private loadBoard(boardHeight: number, boardWidth: number): number[][] {
    return Array(boardHeight).fill(0).map(() => Array(boardWidth).fill(0));
  }

  public reset(): void{
    this.nextPieceBoard = this.loadBoard(NEXT_PIECE_HEIGHT, NEXT_PIECE_WIDTH);
  }

  public drawNextPiece(context: CanvasRenderingContext2D, nextPiece: Piece): void{
    context.fillStyle = nextPiece.color.fill;
    context.strokeStyle = nextPiece.color.stroke;
    if(nextPiece.type === PieceType.SQUARE){
      this.printSquare(context);
      return;
    }
    if(nextPiece.type === PieceType.TRIANGLE){
      this.printTriangle(context);
      return;
    }
    if(nextPiece.type === PieceType.ELE){
      this.printEle(context);
      return;
    }
    if(nextPiece.type === PieceType.STAIRCASE){
      this.printStaircase(context);
      return;
    }
    if(nextPiece.type === PieceType.INVERTED_STAIRCASE){
      this.printInvertedStaircase(context);
      return;
    }
    if(nextPiece.type === PieceType.INVERTED_ELE){
      this.printInvertedEle(context);
      return;
    }
    if(nextPiece.type === PieceType.BAR){
      this.printBar(context);
      return;
    }
  }

  private printSquare(context: CanvasRenderingContext2D): void{
    context.fillRect(1, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(1, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
  }

  private printBar(context: CanvasRenderingContext2D): void{
    context.fillRect(2, 1, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(2, 1, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);

    context.fillRect(2, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(2, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);

    context.fillRect(2, 3, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(2, 3, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
  }

  private printTriangle(context: CanvasRenderingContext2D): void{
    context.fillRect(2, 1, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(2, 1, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);

    context.fillRect(2, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(2, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);

    context.fillRect(2, 3, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(2, 3, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);

    context.fillRect(1, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(1, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
  }

  private printEle(context: CanvasRenderingContext2D): void{
    context.fillRect(1, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(1, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);

    context.fillRect(2, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(2, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);

    context.fillRect(3, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(3, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);

    context.fillRect(3, 3, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(3, 3, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
  }


  private printInvertedEle(context: CanvasRenderingContext2D): void{
    context.fillRect(1, 3, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(1, 3, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);

    context.fillRect(2, 3, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(2, 3, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);

    context.fillRect(3, 3, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(3, 3, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);

    context.fillRect(3, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(3, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
  }

  private printStaircase(context: CanvasRenderingContext2D): void{
    context.fillRect(1, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(1, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);

    context.fillRect(2, 1, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(2, 1, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);

    context.fillRect(2, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(2, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
  }

  private printInvertedStaircase(context: CanvasRenderingContext2D): void{
    context.fillRect(1, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(1, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);

    context.fillRect(2, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(2, 2, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);

    context.fillRect(2, 3, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
    context.strokeRect(2, 3, SIZE_SQUARE_IN_BOARD, SIZE_SQUARE_IN_BOARD);
  }
}
