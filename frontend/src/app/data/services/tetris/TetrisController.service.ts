import { DestroyRef, Injectable, NgZone, inject } from '@angular/core';
import { BoardService } from '@app/data/services/tetris/Board.service';
import { BagOfPiecesService } from './BagOfPieces.service';
import { Piece } from '@app/data/models/tetris/Piece';
import {
  ACTIONS,
  BOARD_HEIGHT,
  BOARD_HEIGHT_SCREEN,
  BOARD_WIDTH,
  BOARD_WIDTH_SCREEN,
  LEVELS,
  LINE_WIDTH_SCALE,
  NEXT_POSITION,
  SHADOW_BLUR_SCALE,
} from '@app/presentation/pages/tetris/tetrisConstanst';
import { ACTION } from '@app/data/models/tetris/MoveDirections.enum';
import { Subject, takeUntil } from 'rxjs';
import { NextPieceBoardService } from './NextPieceBoard.service';
import { Axis } from '@app/data/models/tetris/Axis';
import { PieceType } from '@app/data/models/tetris/PieceType.enum';
import { UpdateBoard } from '@app/data/models/tetris/UpdateBoard';

@Injectable({
  providedIn: 'root',
})
export class TetrisControllerService {
  public gameOver: boolean;

  public isPaused: boolean;
  public nextPiece: Subject<Piece>;
  public updateBoard: Subject<UpdateBoard>;

  private boardController = inject(BoardService);
  private bagOfPieces = inject(BagOfPiecesService);
  private nextPieceBoard = inject(NextPieceBoardService);
  private ngZone = inject(NgZone);
  private destroy$ = destroy();
  public animationFrameId: number = 0;

  public level: number;

  constructor() {
    this.gameOver = false;
    this.isPaused = true;
    this.nextPiece = new Subject<Piece>(); 
    this.updateBoard = new Subject<UpdateBoard>(); 
    this.level = 1;
  }

  updateNextPiece = (context: CanvasRenderingContext2D, width: number, height: number)=>
    this.nextPiece.pipe(this.destroy$()).subscribe((nextPiece: any)=>{
      context.lineWidth = LINE_WIDTH_SCALE;
      context.shadowBlur = SHADOW_BLUR_SCALE;
      context.fillStyle = '#000';
      context.fillRect(0, 0, width, height);
      this.nextPieceBoard.drawNextPiece(context, nextPiece);
    });

    runGame(context: CanvasRenderingContext2D, width: number, height: number): void {
      this.gameOver = false;
      this.isPaused = true;
      this.nextPiece.next(this.bagOfPieces.nextPiece());
      context.lineWidth = LINE_WIDTH_SCALE;
      context.shadowBlur = SHADOW_BLUR_SCALE;
      let dropCounter: number = 0;
      let lastTime: number = 0;
  
      const update = (time:number = 0) => {
          //Mueve la pieza automaticamente
          if(!this.gameOver && !this.isPaused){
            const { newDropCounter, newLastTime } = this.movePieceAuto(time, dropCounter, lastTime);
            dropCounter = newDropCounter;
            lastTime = newLastTime;
            this.boardController.drawBoard(context, width, height);
     
            this.draw(context);
          }
          this.ngZone.runOutsideAngular(() => {
            this.animationFrameId = requestAnimationFrame(update);
          });
      };
  
      update();
    }

    movePieceAuto(time: number, dropCounter: number, lastTime: number){
      const deltaTime = time - lastTime;
      lastTime = time;
      dropCounter += deltaTime;
  
      if (dropCounter > LEVELS[this.level]) {
        this.checkCollision();
        this.bagOfPieces.movePiece(ACTION.DOWN);
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
        let piece = this.bagOfPieces.piece.current;
        piece.shape.forEach((row, x) => {
          row.forEach((value, y) => {
            if (value > 0) {
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
  
    //Ejecuta una accion segun la tecla pasada
    public executeAction(key: string): void {
      const action = ACTIONS[key];
  
      if(!this.gameOver && !this.isPaused){
        if (action !== undefined  && !this.detectedACollision(this.bagOfPieces.piece.current, action)) {
          this.bagOfPieces.movePiece(action);
        } else if(action === ACTION.DOWN){
          this.checkCollisionEffects();
        }
  
        if (action === ACTION.ROTATE && this.bagOfPieces.piece.current.isMovable) {
          this.rotate();
        }
      }
  
      if(action === ACTION.PAUSE){
        this.isPaused = !this.isPaused;
      }
    }
  
    //Ejecuta efectos de una colision
    checkCollisionEffects(){
      this.boardController.solidifyPieceInBoard(this.bagOfPieces.piece.current);
      this.bagOfPieces.recoverNextPiece();
      let updateLevel =this.boardController.verifyLines();
      this.level = updateLevel === 0 ? this.level : updateLevel;
      this.endGame();
      this.nextPiece.next(this.bagOfPieces.nextPiece());
    }
  
    //Termina el juego al detectar una colision, util al resetear la pieza
    endGame(){
      if(this.detectedACollision(this.bagOfPieces.piece.current, ACTION.DOWN)){
        this.gameOver = true;
      }
    }
  
    //Verifica que la forma + unas cordenadas no se salga de los limites del tablero
    isWithinBoardLimits(axis: Axis, shape: number[][]): boolean {
      const { x, y } = axis;
      const numRows = shape.length-1;
      const numCols = shape[0].length-1;
  
      return (
        x >= 0 &&
        x + numRows < BOARD_WIDTH_SCREEN &&
        y >= 0 &&
        y + numCols < BOARD_HEIGHT_SCREEN
      );
    }
  
    //Rota una forma en sentido de las agujas del reloj
    rotateShapeClockwise(shape: number[][]): number[][] {
      const numRows = shape.length;
      const numCols = shape[0].length;
      const rotated = [];
    
      for (let col = numCols - 1; col >= 0; col--) {
        const newRow = [];
        for (let row = 0; row < numRows; row++) newRow.push(shape[row][col]);
        rotated.push(newRow);
      }
      return rotated;
    }
  
    //Detacta si la pieza tubo una colision en la direccion pasada
    detectedACollision(piece: Piece, direction: ACTION): boolean{
      const { x, y } = piece.position;
  
      return this.bagOfPieces.piece.current.shape.some((row, rowX) =>
        row.some((cell, cellY) =>{
              const boardX = x + rowX;
              const boardY = y + cellY;
  
              let isOutOfBounds = false;
              let isOccupied    = false;
              if(direction === ACTION.RIGHT){
                isOutOfBounds = boardX+NEXT_POSITION >= BOARD_WIDTH_SCREEN;
                isOccupied    = this.boardController.board[boardY][boardX+NEXT_POSITION] === 1;
              } else if(direction === ACTION.LEFT){
                isOutOfBounds = boardX-NEXT_POSITION < 0;
                isOccupied    = this.boardController.board[boardY][boardX-NEXT_POSITION] === 1;
              } else if(direction === ACTION.DOWN){
                isOutOfBounds = boardY+NEXT_POSITION >= BOARD_HEIGHT_SCREEN-1;
                isOccupied    = !isOutOfBounds && this.boardController.board[boardY+NEXT_POSITION+1][boardX] === 1;
              }

              return (cell === 1) && (isOutOfBounds || isOccupied)
        })
      );
    }
  
    doesRotationCollide(rotated: number[][]): boolean {
      const { x, y } = this.bagOfPieces.piece.current.position; // Obtener la posición actual de la pieza
  
      return rotated.some((row, rowX) =>
        row.some((cell, cellY) =>{
          const boardX = x + rowX;
          const boardY = y + cellY;
  
          const isOutOfBounds =
          boardY >= BOARD_HEIGHT_SCREEN || boardX < 0 || boardX >= BOARD_WIDTH_SCREEN;
  
        const isOccupied =
          this.boardController.board[boardY][boardX] === 1;
  
          return isOutOfBounds || isOccupied;
        })
      );
    }
    
    rotate(){
     
      const previousShape = this.bagOfPieces.piece.current.shape;
      const rotated = this.rotateShapeClockwise(previousShape);
  
      if (
        this.isWithinBoardLimits(this.bagOfPieces.piece.current.position, rotated) && 
        !this.doesRotationCollide(rotated)
      ) {
        this.bagOfPieces.piece.current.shape = rotated;
      }
    }
  
    public playAgain(): void{
      this.gameOver = false;
      this.isPaused = false;
    }
  
    public reset(): void{
      this.boardController.reset();
      this.bagOfPieces.reset();
      this.nextPieceBoard.reset();
      this.level = 1;
    }
  
    public pause(): void{
      this.isPaused= true;
    }
  
    public resume(): void{
      this.isPaused = false;
    }
  }

export function destroy(){
  const subject = new Subject();

  inject(DestroyRef).onDestroy(()=>{
    subject.next(true);
    subject.complete();
  });

  return ()=> takeUntil(subject.asObservable());
}