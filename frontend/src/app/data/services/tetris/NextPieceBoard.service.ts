import { Injectable } from '@angular/core';
import { Piece } from '@app/data/models/tetris/Piece';
import { PieceType } from '@app/data/models/tetris/PieceType.enum';
import { NEXT_PIECE_HEIGHT, NEXT_PIECE_WIDTH, SIZE_SQUARE_IN_BOARD } from 'assets/constants/tetrisConstanst';
import { fillMatrix } from '../util.service';

@Injectable({
  providedIn: 'root'
})
export class NextPieceBoardService {
  nextPiece!: Piece;
  nextPieceBoard: number[][];

  constructor() {
    this.nextPieceBoard = fillMatrix(NEXT_PIECE_HEIGHT, NEXT_PIECE_WIDTH, 0) as number[][];
  }

  public reset(): void{
    this.nextPieceBoard = fillMatrix(NEXT_PIECE_HEIGHT, NEXT_PIECE_WIDTH, 0) as number[][];
  }

  public drawNextPiece(context: CanvasRenderingContext2D, nextPiece: Piece): void{
    context.fillStyle = nextPiece.color.fill;
    context.strokeStyle = nextPiece.color.stroke;
 
    this.executeIfTypesMatch((nextPiece.type === PieceType.SQUARE), ()=>this.printSquare(context));
    this.executeIfTypesMatch((nextPiece.type === PieceType.TRIANGLE), ()=>this.printTriangle(context));
    this.executeIfTypesMatch((nextPiece.type === PieceType.ELE), ()=>this.printEle(context));
    this.executeIfTypesMatch((nextPiece.type === PieceType.STAIRCASE), ()=>this.printStaircase(context));
    this.executeIfTypesMatch((nextPiece.type === PieceType.INVERTED_STAIRCASE), ()=>this.printInvertedStaircase(context));
    this.executeIfTypesMatch((nextPiece.type === PieceType.INVERTED_ELE), ()=>this.printInvertedEle(context));
    this.executeIfTypesMatch((nextPiece.type === PieceType.BAR), ()=>this.printBar(context));
  }

  public executeIfTypesMatch(typesMatch: boolean, printShape: ()=> void): void{
    if(typesMatch){
      printShape();
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
