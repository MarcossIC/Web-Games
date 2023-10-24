import { Injectable } from '@angular/core';
import { Piece } from '@app/data/models/tetris/Piece';
import { PieceType } from '@app/data/models/tetris/PieceType.enum';
import { NEXT_PIECE_HEIGHT, NEXT_PIECE_WIDTH, FULL_SQUARE_SIZE, SHORT_SUQUARE_SIZE } from 'assets/constants/tetrisConstanst';
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
    console.log("SQUARE");
    context.fillRect(2, 2, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(2, 2, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
  }

  private printBar(context: CanvasRenderingContext2D): void{
    console.log("BAR");
    context.fillRect(2, 1, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(2, 1, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);

    context.fillRect(2, 2, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(2, 2, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);

    context.fillRect(2, 3, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(2, 3, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
  }

  private printTriangle(context: CanvasRenderingContext2D): void{
    console.log("TRIANGLE");
    context.fillRect(2.5, 1, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(2.5, 1, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);

    context.fillRect(2.5, 2, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(2.5, 2, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);

    context.fillRect(2.5, 3, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(2.5, 3, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);

    context.fillRect(1.5, 2, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(1.5, 2, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
  }

  //X, Y,
  private printEle(context: CanvasRenderingContext2D): void{
    console.log("ELE");
    context.fillRect(1, 1.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(1, 1.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);

    context.fillRect(2, 1.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(2, 1.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);

    context.fillRect(3, 1.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(3, 1.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);

    context.fillRect(3, 2.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(3, 2.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
  }


  private printInvertedEle(context: CanvasRenderingContext2D): void{
    console.log("INVERTED ELE");
    context.fillRect(1, 2.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(1, 2.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);

    context.fillRect(2, 2.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(2, 2.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);

    context.fillRect(3, 2.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(3, 2.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);

    context.fillRect(3, 1.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(3, 1.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
  }

  //X, Y
  private printStaircase(context: CanvasRenderingContext2D): void{
    console.log("STAIRCASE");
    context.fillRect(1.5, 2.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(1.5, 2.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);

    
    context.fillRect(2.5, 2.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(2.5, 2.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);

    context.fillRect(2.5, 1.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(2.5, 1.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);

  }

  private printInvertedStaircase(context: CanvasRenderingContext2D): void{
    console.log("STAIR CASE INVERTED");

    context.fillRect(1.5, 2.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(1.5, 2.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);

    context.fillRect(2.5, 2.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(2.5, 2.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);

    context.fillRect(2.5, 3.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
    context.strokeRect(2.5, 3.5, FULL_SQUARE_SIZE, FULL_SQUARE_SIZE);
  }
}
