import { Injectable, NgZone, inject } from '@angular/core';
import { BoardService } from '@app/data/services/tetris/Board.service';
import { BagOfPiecesService } from './BagOfPieces.service';
import { Piece } from '@app/data/models/tetris/Piece';
import {
  ACTIONS, BOARD_HEIGHT_SCREEN, BOARD_WIDTH_SCREEN, LINE_WIDTH_SCALE, NEXT_POSITION, SHADOW_BLUR_SCALE, SPEED_PER_LEVEL } from 'assets/constants/tetrisConstanst';
import { ACTION } from '@app/data/models/tetris/MoveDirections.enum';
import { Subject } from 'rxjs';
import { NextPieceBoardService } from './NextPieceBoard.service';
import { destroy } from '../util.service';
import { ChronometerServiceService } from '../chronometerService.service';
import { GameName } from '@app/data/models/GameName.enum';

@Injectable({
  providedIn: 'root',
})
export class TetrisControllerService {
  public gameOver: boolean;

  public isPaused: boolean;
  public nextPiece: Subject<Piece>;
  public level: number;
  public animationFrameId: number;

  //Injected services
  private boardController: BoardService = inject(BoardService);
  private bagOfPieces: BagOfPiecesService = inject(BagOfPiecesService);
  private nextPieceBoard: NextPieceBoardService = inject(NextPieceBoardService);
  private ngZone: NgZone = inject(NgZone);
  private chronometerService: ChronometerServiceService = inject(ChronometerServiceService);
  private destroy$ = destroy();

  constructor() {
    this.animationFrameId = 0;
    this.gameOver = false;
    this.isPaused = true;
    this.nextPiece = new Subject<Piece>();
    this.level = 1;
  }

  updateNextPiece = (
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ) =>
    this.nextPiece.pipe(this.destroy$()).subscribe((nextPiece: any) => {
      context.lineWidth = LINE_WIDTH_SCALE;
      context.shadowBlur = SHADOW_BLUR_SCALE;
      context.fillStyle = '#000';
      context.fillRect(0, 0, width, height);
      this.nextPieceBoard.drawNextPiece(context, nextPiece);
    });

  runGame(
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    this.gameOver = false;
    this.isPaused = true;
    this.chronometerService.updateGameName(GameName.TETRIS);
    this.chronometerService.updated.next({gameOver: this.gameOver, isPaused: this.isPaused});
    this.nextPiece.next(this.bagOfPieces.nextPiece());
    context.lineWidth = LINE_WIDTH_SCALE;
    context.shadowBlur = SHADOW_BLUR_SCALE;
    let dropCounter: number = 0;
    let lastTime: number = 0;

    const update = (time: number = 0) => {
      if (!this.gameOver && !this.isPaused) {
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

  private movePieceAuto(time: number, dropCounter: number, lastTime: number): { newDropCounter: number; newLastTime: number; } {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > SPEED_PER_LEVEL[this.level]) {
      this.bagOfPieces.movePiece(ACTION.DOWN);
      this.checkCollision();
      dropCounter = 0;
    }
    return { newDropCounter: dropCounter, newLastTime: lastTime };
  }

  protected checkCollision(): void {
    if (this.detectedACollision(this.bagOfPieces.piece.current, ACTION.DOWN)) 
      this.checkCollisionEffects();
  }

  private draw(context: CanvasRenderingContext2D): void {
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

    if (!this.gameOver && !this.isPaused) {
      if (
      action !== undefined &&
        !this.detectedACollision(this.bagOfPieces.piece.current, action)
      ) {
        this.bagOfPieces.movePiece(action);
      } 
      if (
        action === ACTION.ROTATE &&
        this.bagOfPieces.piece.current.isMovable
      ) {
        this.rotate();
      }
      //
      if (this.detectedACollision(this.bagOfPieces.piece.current, ACTION.DOWN)) {
        this.checkCollisionEffects();
      }
    }

    if (action === ACTION.PAUSE) {
      this.isPaused = !this.isPaused;
    }
  }

  //Ejecuta efectos de una colision
  private checkCollisionEffects(): void {
    this.boardController.solidifyPieceInBoard(this.bagOfPieces.piece.current);
    
    let updateLevel = this.boardController.verifyLines();
    this.level = updateLevel;
    this.bagOfPieces.recoverNextPiece();
    this.endGame();
    this.nextPiece.next(this.bagOfPieces.nextPiece());
  }

  //Termina el juego al detectar una colision, util al resetear la pieza
  public endGame(): void {
    if (this.detectedACollision(this.bagOfPieces.piece.current, ACTION.DOWN)) {
      this.gameOver = true;
      this.chronometerService.updated.next({gameOver: this.gameOver, isPaused: this.isPaused});
    }
  }

  //Verifica que la forma + unas cordenadas no se salga de los limites del tablero
  private isWithinBoardLimits(x: number, y: number, shape: number[][], isPieceOnRightEdge: boolean): boolean {
    const numRows = shape.length-1;
    const numCols = shape[0].length-1;
    const lastRow = numRows + x;
    const lastCol = numCols + y;

    return (
        x >= 0 &&
        lastRow < BOARD_WIDTH_SCREEN &&
        y >= 0 &&
        lastCol < BOARD_HEIGHT_SCREEN
    );
  }

  //Rota una forma en sentido de las agujas del reloj
  private rotateShapeClockwise(shape: number[][], numRows: number, numCols: number): number[][] {
    const rotated = [];
    
    for (let col = numCols - 1; col >= 0; col--) {
      
      const newRow = [];
      for (let row = 0; row < numRows; row++) newRow.push(shape[row][col]);
      rotated.push(newRow);
    }
    return rotated;
  }

  //Rota una forma en sentido a contra reloj
  private rotateShapeCounterClockwise(shape: number[][], numRows: number, numCols: number): number[][] {
    const rotated = [];
    let curTetrominoBU;
    for(let i = 0; i < shape.length; i++) {
        curTetrominoBU = [...shape];
 
        let x = shape[i][0];
        let y = shape[i][1];
        let newX = (this.getLastSquareX(shape) - y);
        let newY = x;
        rotated.push([newX, newY]);
    }
    return rotated;
}

 
  getLastSquareX(shape: number[][]) {
      let lastX = 0;
      for(let i = 0; i < shape.length; i++)
      {
          let square = shape[i];
          if (square[0] > lastX)
              lastX = square[0];
      }
      return lastX;
  }

  //Detacta si la pieza tubo una colision en la direccion pasada
  private detectedACollision(piece: Piece, direction: ACTION): boolean {
    const { x, y } = piece.position;

    for (let rowX = 0; rowX < piece.shape.length; rowX++) {
      for (let cellY = 0; cellY < piece.shape[rowX].length; cellY++) {
        const cell = piece.shape[rowX][cellY];
        const boardX = x + rowX;
        const boardY = y + cellY;

        let isOutOfBounds = false;
        let isOccupied = false;

        if (direction === ACTION.RIGHT) {
          isOutOfBounds = boardX + NEXT_POSITION >= BOARD_WIDTH_SCREEN;
          isOccupied =
            !isOutOfBounds &&
            this.boardController.board[boardY][boardX + NEXT_POSITION] > 0;
        } else if (direction === ACTION.LEFT) {
          isOutOfBounds = boardX - NEXT_POSITION < 0;
          isOccupied =
            !isOutOfBounds &&
            this.boardController.board[boardY][boardX - NEXT_POSITION] > 0;
        } else if (direction === ACTION.DOWN) {
          isOutOfBounds = boardY + NEXT_POSITION >= BOARD_HEIGHT_SCREEN;
          isOccupied =
            !isOutOfBounds &&
            this.boardController.board[boardY + NEXT_POSITION][boardX] > 0;
        }

        if (cell === 1 && (isOutOfBounds || isOccupied)) {
          return true; // Salir de la función tan pronto como se cumpla la condición
        }
      }
    }

    return false; // Si no se cumple la condición en ningún caso, regresar falso al final
  }

  private doesRotationCollide(rotated: number[][], isPieceOnRightEdge: boolean): boolean {
    const { x, y } = this.bagOfPieces.piece.current.position; // Obtener la posición actual de la pieza

    return rotated.some((row, rowX) =>
      row.some((cell, cellY) => {
        const boardX = rowX + x;
        const boardY = y + cellY;

        const isOutOfBounds =
          boardY >= BOARD_HEIGHT_SCREEN ||
          boardX < 0 ||
          boardX >= BOARD_WIDTH_SCREEN;

        const isOccupied = this.boardController.board[boardY][boardX] === 1;

        return isOutOfBounds || isOccupied;
      })
    );
  }

  private isPieceOnRightEdge(numCols: number, xPosition: number): boolean {
    return xPosition+numCols >= BOARD_WIDTH_SCREEN-1;
  }

  public rotate(): void {
    const { position: {x, y}, shape } = this.bagOfPieces.piece.current;
    const numRows = shape.length;
    const numCols = shape[0].length;

    const rotated =  this.rotateShapeClockwise(shape, numRows, numCols);
    if (
      this.isWithinBoardLimits(x, y, rotated, false) &&
      !this.doesRotationCollide(rotated, false)
    ) {
      this.bagOfPieces.piece.current.shape = rotated;
    } 
  }

  public playAgain(): void {
    this.gameOver = false;
    this.isPaused = false;
    this.chronometerService.updated.next({gameOver: this.gameOver, isPaused: this.isPaused});
  }

  public reset(): void {
    this.boardController.reset();
    this.bagOfPieces.reset();
    this.nextPieceBoard.reset();
    this.level = 1;
  }

  public pause(): void {
    this.isPaused = true;
    this.chronometerService.updated.next({gameOver: this.gameOver, isPaused: this.isPaused});
  }

  public resume(): void {
    this.isPaused = false;
    this.chronometerService.updated.next({gameOver: this.gameOver, isPaused: this.isPaused});
  }
}


