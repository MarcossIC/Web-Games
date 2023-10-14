import { Injectable, NgZone } from '@angular/core';
import { BoardService } from '@app/data/services/tetris/Board.service';
import { BagOfPiecesService } from './BagOfPieces.service';
import { Piece } from '@app/data/models/tetris/Piece';
import {
  ACTIONS,
  BOARD_HEIGHT,
  BOARD_HEIGHT_SCREEN,
  BOARD_WIDTH,
  BOARD_WIDTH_SCREEN,
  LINE_WIDTH_SCALE,
  NEXT_POSITION,
  SHADOW_BLUR_SCALE,
} from '@app/presentation/pages/tetris/tetrisConstanst';
import { ACTION } from '@app/data/models/tetris/MoveDirections.enum';
import { Subject } from 'rxjs';
import { NextPieceBoardService } from './NextPieceBoard.service';

@Injectable({
  providedIn: 'root',
})
export class TetrisControllerService {
  public gameOver: boolean;
  public isGammingRunning: boolean;
  public isPaused: boolean;
  public nextPiece: Subject<Piece>;
  protected collision: Subject<boolean> = new Subject();

  constructor(
    private boardController: BoardService,
    private bagOfPieces: BagOfPiecesService,
    private nextPieceBoard: NextPieceBoardService,
    private ngZone: NgZone
  ) {
    this.gameOver = false;
    this.isGammingRunning = true;
    this.isPaused = true;
    this.nextPiece = new Subject<Piece>(); 
  }

  //Game Loop
  runGame(context: CanvasRenderingContext2D, width: number, height: number): void {
    this.isGammingRunning = true;
    this.gameOver = false;
    this.isPaused = true;
    this.nextPiece.next(this.bagOfPieces.nextPiece());

    let dropCounter: number = 0;
    let lastTime: number = 0;

    const update = (time:number = 0) => {
      if(this.isGammingRunning){
        //Mueve la pieza automaticamente
        if(!this.gameOver && !this.isPaused){
          const { newDropCounter, newLastTime } = this.movePieceAuto(time, dropCounter, lastTime);
          dropCounter = newDropCounter;
          lastTime = newLastTime;
          this.boardController.drawBoard(context, width, height);
   
          this.draw(context);
        }
        this.ngZone.runOutsideAngular(() => requestAnimationFrame(update));
      }
    };

    update();
  }


  movePieceAuto(time: number, dropCounter: number, lastTime: number){
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > 1000) {
      this.checkCollision();
      this.bagOfPieces.piece.moveToDown();
      dropCounter = 0;
    }
    return { newDropCounter: dropCounter, newLastTime: lastTime };
  }

  protected checkCollision(): void {
    if (this.detectedACollision(this.bagOfPieces.piece.current, ACTION.DOWN)) {
      this.checkCollisionEffects();
    }
  }

  draw(context: CanvasRenderingContext2D) {
    context.lineWidth = LINE_WIDTH_SCALE;
    context.shadowBlur = SHADOW_BLUR_SCALE;

      let piece = this.bagOfPieces.piece.current;
      piece.shape.forEach((row, x) => {
        row.forEach((value, y) => {
          if (value === 1) {
            //Configuracion
            context.fillStyle = piece.color.fill;
            context.strokeStyle = piece.color.stroke;

            //Le sumo a la pieza su pocicion, para hallar donde se debe pintar
            let boardX = x + piece.position.x;
            let boardY = y + piece.position.y;

            context.fillRect(boardX, boardY, 1, 1);
            context.strokeRect(boardX, boardY, 1, 1);
          }
        });
      });
  }

  updateNextPiece = (context: CanvasRenderingContext2D, width: number, height: number)=>
    this.nextPiece.subscribe((nextPiece: Piece)=>{
      context.lineWidth = LINE_WIDTH_SCALE;
      context.shadowBlur = SHADOW_BLUR_SCALE;
      context.fillStyle = '#000';
      context.fillRect(0, 0, width, height);
      this.nextPieceBoard.drawNextPiece(context, nextPiece);
    });

  executeAction(key: string): void {
    if(!this.gameOver && !this.isPaused){
      console.log("key: "+key);
      if (ACTIONS[key] === ACTION.LEFT && !this.detectedACollision(this.bagOfPieces.piece.current, ACTIONS[key])){
        this.bagOfPieces.piece.moveToLeft();
      }

      if (ACTIONS[key] === ACTION.RIGHT && !this.detectedACollision(this.bagOfPieces.piece.current, ACTIONS[key])){
        this.bagOfPieces.piece.moveToRight();
      }

      if (ACTIONS[key] === ACTION.DOWN && !this.detectedACollision(this.bagOfPieces.piece.current, ACTIONS[key])) {
        this.bagOfPieces.piece.moveToDown();
      } else if(ACTIONS[key] === ACTION.DOWN){
        console.log("Entre");
        this.checkCollisionEffects();
      }

      if(ACTIONS[key] === ACTION.ROTATE &&
        this.bagOfPieces.piece.current.isMovable){
        this.rotate();
      }
    }
    if(ACTIONS[key] === ACTION.PAUSE){
      this.isPaused = !this.isPaused;
    }
  }

  checkCollisionEffects(){
    this.boardController.solidifyPieceInBoard(this.bagOfPieces.piece.current);
    this.bagOfPieces.recoverNextPiece();
    this.boardController.verifyLines();
    this.endGame();
    this.nextPiece.next(this.bagOfPieces.nextPiece());
  }

  endGame(){
    if(this.detectedACollision(this.bagOfPieces.piece.current, ACTION.DOWN)){
      this.gameOver = true;
    }
  }

  isWithinBoardLimits(piece: Piece, shape: number[][]): boolean {
    const { x, y } = piece.position;
    const numRows = shape.length-1;
    const numCols = shape[0].length-1;

    //Verifica que la cords x, y de la pieza no esten por debajo de 0 o por encima de los limites
    return (
      x >= 0 &&
      x + numRows < BOARD_WIDTH &&
      y >= 0 &&
      y + numCols < BOARD_HEIGHT
    );
  }

  rotateShapeClockwise(shape: number[][]): number[][] {
    const numRows = shape.length;
    const numCols = shape[0].length;
    const rotated = [];
  
    for (let col = numCols - 1; col >= 0; col--) {
      const newRow = [];
  
      for (let row = 0; row < numRows; row++) {
        newRow.push(shape[row][col]);
      }
  
      rotated.push(newRow);
    }
  
    return rotated;
  }

  detectedACollision(piece: Piece, direction: ACTION): boolean{
    const { x, y } = piece.position;

    return this.bagOfPieces.piece.current.shape.some((row, rowX) =>
      row.some((cell, cellY) =>{
            const boardX = x + rowX;
            const boardY = y + cellY;
            const isOutOfBoundsInRight = direction === ACTION.RIGHT && (boardX+NEXT_POSITION >= BOARD_WIDTH_SCREEN);
            const isOccupiedInRight    = direction === ACTION.RIGHT && (this.boardController.board[boardY][boardX+NEXT_POSITION] === 1);

            const isOutOfBoundsInLeft= direction === ACTION.LEFT && (boardX-NEXT_POSITION < 0);
            const isOccupiedInLeft   = direction === ACTION.LEFT && (this.boardController.board[boardY][boardX-NEXT_POSITION] === 1);

            const isOutOfBoundsInDown= direction === ACTION.DOWN && (boardY+NEXT_POSITION >= BOARD_HEIGHT_SCREEN-1);
            const isOccupiedInDown   = direction === ACTION.DOWN && (!isOutOfBoundsInDown && this.boardController.board[boardY+NEXT_POSITION+1][boardX] === 1);


            //const isOccupiedInDown2 = direction === ACTION.DOWN && (boardY+NEXT_POSITION >= 0 && this.boardController.board[boardY + NEXT_POSITION][boardX] !== 0);
            return (cell === 1) && (
            (isOutOfBoundsInRight || isOccupiedInRight) || 
            (isOutOfBoundsInLeft || isOccupiedInLeft) || 
            (isOutOfBoundsInDown || isOccupiedInDown)
            )
      })
    );
  }

  doesRotationCollide(piece: Piece, rotated: number[][]): boolean {
    const { x, y } = piece.position; // Obtener la posición actual de la pieza
    const numRows = rotated.length;   // Número de filas en la forma rotada
    const numCols = rotated[0].length; // Número de columnas en la forma rotada
  
    // Iterar sobre cada celda en la forma rotada
    for (let row = 0; row < numRows; row++) {
      for (let cell = 0; cell < numCols; cell++) {
        if (rotated[row][cell] === 1) {
          const boardX = x + row;
          const boardY = y + cell;
  
          const isOutOfBounds =
            boardY >= BOARD_HEIGHT_SCREEN || boardX < 0 || boardX >= BOARD_WIDTH_SCREEN;

          const isOccupied =
            this.boardController.board[boardY][boardX] === 1;
  
          if (isOutOfBounds || isOccupied) {
            return true;
          }
        }
      }
    }

    return false; 
  }
  
  rotate(){
   
    const previousShape = this.bagOfPieces.piece.current.shape;
    const rotated = this.rotateShapeClockwise(previousShape);

    if (
      this.isWithinBoardLimits(this.bagOfPieces.piece.current, rotated) && 
      !this.doesRotationCollide(this.bagOfPieces.piece.current, rotated)
    ) {
      this.bagOfPieces.piece.current.shape = rotated;
    }
  }

  public closeGame(): void{
    this.isGammingRunning = false;
  }

  public playAgain(): void{

    this.gameOver = false;
    this.isPaused = false;
  }

  public reset(): void{
    this.boardController.reset();
    this.bagOfPieces.reset();
    this.nextPieceBoard.reset();
  }

  public pause(): void{
    this.isPaused= true;
  }

  public resume(): void{
    this.isPaused = false;
    this.isGammingRunning = true;
  }
}
