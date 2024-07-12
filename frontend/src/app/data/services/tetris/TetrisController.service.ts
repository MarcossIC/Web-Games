import { DestroyRef, Injectable, NgZone, inject, signal } from '@angular/core';
import { BoardService } from '@app/data/services/tetris/Board.service';
import { BagOfPiecesService } from './BagOfPieces.service';
import { Piece } from '@app/data/models/tetris/Piece';
import {
  ACTIONS,
  LINE_WIDTH_SCALE,
  NEXT_POSITION,
  SHADOW_BLUR_SCALE,
  SPEED_PER_LEVEL,
} from 'assets/constants/tetrisConstanst';
import { ACTION } from '@app/data/models/tetris/MoveDirections.enum';
import { Subject } from 'rxjs';
import { NextPieceBoardService } from './NextPieceBoard.service';

import { ChronometerServiceService } from '../chronometerService.service';
import { GameName } from '@app/data/models/GameName.enum';
import { BoardSizeService } from '@app/data/services/BoardSize.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable()
export class TetrisControllerService {
  private _isPaused = signal(true);
  private _isGameOver = signal(false);
  private _level = signal(0);

  public nextPiece: Subject<Piece>;

  public animationFrameId: number;

  //Injected services
  private boardSize = inject(BoardSizeService);
  private boardController = inject(BoardService);
  private bagOfPieces = inject(BagOfPiecesService);
  private nextPieceBoard = inject(NextPieceBoardService);
  private ngZone = inject(NgZone);
  private chronometerService = inject(ChronometerServiceService);
  private detroy$ = inject(DestroyRef);

  constructor() {
    this.boardSize.typeToTetris();
    this.animationFrameId = 0;
    this.gameOver = false;
    this._isPaused.set(true);
    this.nextPiece = new Subject<Piece>();
    this.level = 1;
  }

  public updateNextPiece = (
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ) =>
    this.nextPiece
      .pipe(takeUntilDestroyed(this.detroy$))
      .subscribe((nextPiece: any) => {
        context.lineWidth = LINE_WIDTH_SCALE;
        context.shadowBlur = SHADOW_BLUR_SCALE;
        context.fillStyle = '#000';
        context.fillRect(0, 0, width, height);
        this.nextPieceBoard.drawNextPiece(context, nextPiece);
      });

  /**
   * Inicia y ejecuta el juego de Tetris.
   *
   * @param context - El contexto 2D del canvas donde se dibujará el juego.
   * @param width - El ancho del área de juego en píxeles.
   * @param height - La altura del área de juego en píxeles.
   *
   * Esta función configura el estado inicial del juego.
   * Funcionamiento:
   * 1. Inicializa las variables de estado del juego.
   * 2. Actualiza el nombre del juego en el servicio de cronómetro.
   * 3. Genera la siguiente pieza.
   * 4. Configura el estilo de dibujo del contexto.
   * 5. Inicia un bucle de animación que:
   *    - Mueve la pieza automáticamente si el juego no está pausado o terminado.
   *    - Dibuja el tablero y las piezas.
   *    - Solicita el siguiente frame de animación.
   *
   * La función utiliza `requestAnimationFrame` para mantener una animación fluida
   * y se ejecuta fuera de la zona de detección de cambios de Angular(ZoneJs) para mejor rendimiento.
   */
  public runGame(
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    this.chronometerService.updateGameName(GameName.TETRIS);
    this.gameOver = false;
    this.isPaused = true;

    this.nextPiece.next(this.bagOfPieces.nextPiece());
    context.lineWidth = LINE_WIDTH_SCALE;
    context.shadowBlur = SHADOW_BLUR_SCALE;
    let dropCounter: number = 0;
    let lastTime: number = 0;

    const update = (time: number = 0) => {
      if (!this._isGameOver() && !this._isPaused()) {
        const { newDropCounter, newLastTime } = this.movePieceAuto(
          time,
          dropCounter,
          lastTime
        );
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

  /**
   * Mueve automáticamente la pieza actual hacia abajo.
   * Calcula el tiempo transcurrido y mueve la pieza hacia abajo
   * cuando se alcanza el intervalo definido por el nivel actual.
   * Verifica colisiones después del movimiento.
   *
   * @param time - Tiempo actual del juego (ms).
   * @param dropCounter - Tiempo acumulado desde la última caída.
   * @param lastTime - Tiempo de la última actualización.
   * @returns Nuevos valores de dropCounter y lastTime.
   */
  private movePieceAuto(
    time: number,
    dropCounter: number,
    lastTime: number
  ): { newDropCounter: number; newLastTime: number } {
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

  /**
   * Dibuja la pieza actual en el contexto del canvas.
   *
   * @param context - El contexto 2D del canvas donde se dibujará la pieza.
   *
   * Recorre la forma de la pieza actual y dibuja cada bloque ocupado
   * en su posición correspondiente en el tablero. Utiliza el color
   * de relleno y de borde definidos para la pieza.
   */
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

  /**
   * Ejecuta una acción en el juego basada en la tecla presionada.
   *
   * @param key - La tecla presionada que determina la acción a ejecutar.
   *
   * Realiza diferentes acciones dependiendo de la tecla:
   * - Mueve o rota la pieza si no hay colisión y el juego está activo.
   * - Verifica efectos de colisión si la pieza no puede moverse hacia abajo.
   * - Alterna el estado de pausa del juego si se presiona la tecla de pausa.
   */
  public executeAction(key: string): void {
    const action = ACTIONS[key];

    //Las acciones solo se ejecutan si el juego no ha terminado y no está pausado
    if (!this._isGameOver() && !this._isPaused()) {
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

      if (
        this.detectedACollision(this.bagOfPieces.piece.current, ACTION.DOWN)
      ) {
        this.checkCollisionEffects();
      }
    }

    if (action === ACTION.PAUSE) {
      this.isPaused = true;
    }
  }

  /**
   * Maneja los efectos de una colisión de la pieza actual.
   *
   * Solidifica la pieza, verifica líneas, actualiza el nivel,
   * obtiene la siguiente pieza y verifica el fin del juego.
   */
  private checkCollisionEffects(): void {
    this.boardController.solidifyPieceInBoard(this.bagOfPieces.piece.current);

    let updateLevel = this.boardController.updateBoardAndScore();
    this.level = updateLevel;
    this.bagOfPieces.recoverNextPiece();
    this.endGame();
    this.nextPiece.next(this.bagOfPieces.nextPiece());
  }

  //Termina el juego al detectar una colision, util al resetear la pieza
  public endGame(): void {
    if (this.detectedACollision(this.bagOfPieces.piece.current, ACTION.DOWN)) {
      this.gameOver = true;
    }
  }

  /**
   * Verifica si una pieza está dentro de los límites del tablero.
   *
   * @param x - Posición X de la pieza en el tablero.
   * @param y - Posición Y de la pieza en el tablero.
   * @param shape - Matriz que representa la forma de la pieza.
   * @returns true si la pieza está completamente dentro del tablero, false en caso contrario.
   */
  private isWithinBoardLimits(
    x: number,
    y: number,
    shape: number[][],
    isPieceOnRightEdge: boolean
  ): boolean {
    const pieceWidth = shape[0].length;
    const pieceHeight = shape.length;

    const isWithinLeftAndTop = x >= 0 && y >= 0;
    const isWithinRight = x + pieceWidth <= this.boardSize.WIDTH;
    const isWithinBottom = y + pieceHeight <= this.boardSize.HEIGHT;

    return isWithinLeftAndTop && isWithinRight && isWithinBottom;
  }

  /**
   * Rota una matriz 2D en sentido horario.
   *
   * @param shape - La matriz 2D a rotar.
   * @param numRows - Número de filas de la matriz.
   * @param numCols - Número de columnas de la matriz.
   * @returns Una nueva matriz rotada 90 grados en sentido horario.
   *
   * Crea una nueva matriz donde las columnas de la original
   * se convierten en filas, invirtiendo el orden de las columnas.
   */
  private rotateShapeClockwise(
    shape: number[][],
    numRows: number,
    numCols: number
  ): number[][] {
    const rotated = [];

    for (let col = numCols - 1; col >= 0; col--) {
      const newRow = [];
      for (let row = 0; row < numRows; row++) newRow.push(shape[row][col]);
      rotated.push(newRow);
    }
    return rotated;
  }

  //Rota una forma en sentido a contra reloj
  private rotateShapeCounterClockwise(
    shape: number[][],
    numRows: number,
    numCols: number
  ): number[][] {
    const rotated = [];
    let curTetrominoBU;
    for (let i = 0; i < shape.length; i++) {
      curTetrominoBU = [...shape];

      let x = shape[i][0];
      let y = shape[i][1];
      let newX = this.getLastSquareX(shape) - y;
      let newY = x;
      rotated.push([newX, newY]);
    }
    return rotated;
  }

  getLastSquareX(shape: number[][]) {
    let lastX = 0;
    for (let i = 0; i < shape.length; i++) {
      let square = shape[i];
      if (square[0] > lastX) lastX = square[0];
    }
    return lastX;
  }

  /**
   * Detecta si hay colisión al mover una pieza en una dirección específica.
   *
   * @param piece - La pieza a verificar.
   * @param direction - La dirección del movimiento (ACTION.RIGHT, ACTION.LEFT, ACTION.DOWN).
   * @returns true si se detecta una colisión, false en caso contrario.
   *
   * Verifica cada celda de la pieza para detectar:
   * - Si está fuera de los límites del tablero.
   * - Si colisiona con una celda ocupada del tablero.
   */
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
          isOutOfBounds = boardX + NEXT_POSITION >= this.boardSize.WIDTH;
          isOccupied =
            !isOutOfBounds &&
            this.boardController.board[boardY][boardX + NEXT_POSITION] > 0;
        } else if (direction === ACTION.LEFT) {
          isOutOfBounds = boardX - NEXT_POSITION < 0;
          isOccupied =
            !isOutOfBounds &&
            this.boardController.board[boardY][boardX - NEXT_POSITION] > 0;
        } else if (direction === ACTION.DOWN) {
          isOutOfBounds = boardY + NEXT_POSITION >= this.boardSize.HEIGHT;
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

  /**
   * Verifica si la rotación de una pieza colisiona con el tablero o sus límites.
   *
   * @param rotated - La matriz que representa la forma rotada de la pieza.
   * @param isPieceOnRightEdge - Indica si la pieza está en el borde derecho (no utilizado en la implementación actual).
   * @returns true si la rotación colisiona, false en caso contrario.
   *
   * Comprueba cada celda de la pieza rotada para detectar:
   * - Si está fuera de los límites del tablero.
   * - Si colisiona con una celda ocupada del tablero.
   */
  private doesRotationCollide(
    rotated: number[][],
    isPieceOnRightEdge: boolean
  ): boolean {
    const { x, y } = this.bagOfPieces.piece.current.position; // Obtener la posición actual de la pieza

    return rotated.some((row, rowX) =>
      row.some((cell, cellY) => {
        const boardX = rowX + x;
        const boardY = y + cellY;

        const isOutOfBounds =
          boardY >= this.boardSize.HEIGHT ||
          boardX < 0 ||
          boardX >= this.boardSize.WIDTH;

        const isOccupied = this.boardController.board[boardY][boardX] === 1;

        return isOutOfBounds || isOccupied;
      })
    );
  }

  private isPieceOnRightEdge(numCols: number, xPosition: number): boolean {
    return xPosition + numCols >= this.boardSize.WIDTH - 1;
  }

  /**
   * Intenta rotar la pieza actual en sentido horario.
   *
   * Calcula la forma rotada de la pieza y verifica si es posible aplicar
   * la rotación sin colisiones y dentro de los límites del tablero.
   * Si es válida, actualiza la forma de la pieza actual.
   */
  public rotate(): void {
    const {
      position: { x, y },
      shape,
    } = this.bagOfPieces.piece.current;
    const numRows = shape.length;
    const numCols = shape[0].length;

    const rotated = this.rotateShapeClockwise(shape, numRows, numCols);
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
  }

  public reset(): void {
    this.boardController.reset();
    this.bagOfPieces.reset();
    this.nextPieceBoard.reset();
    this.level = 1;
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }
  public get WIDTH() {
    return this.boardSize.WIDTH;
  }
  public get HEIGHT() {
    return this.boardSize.HEIGHT;
  }
  public get BLOCK() {
    return this.boardSize.BLOCK;
  }
  public get PIECE_SIZE() {
    return this.boardSize.PIECE_SIZE;
  }
  public get isPaused() {
    return this._isPaused();
  }
  public set isPaused(updated: boolean) {
    this._isPaused.set(updated);
    this.chronometerService.isPaused = updated;
  }

  public get gameOver() {
    return this._isGameOver();
  }
  public set gameOver(updated: boolean) {
    this._isGameOver.set(updated);
    this.chronometerService.gameOver = updated;
  }

  public set level(updated: number) {
    this._level.set(updated);
  }
  public get level() {
    return this._level();
  }
}
