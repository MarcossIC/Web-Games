import { DestroyRef, Injectable, NgZone, inject, signal } from '@angular/core';
import { BoardService } from '@app/data/services/tetris/Board.service';
import { BagOfPiecesService } from './BagOfPieces.service';
import { Piece } from '@app/data/models/tetris/Piece';
import {
  ACTIONS,
  LINE_WIDTH_SCALE,
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
  private destroy$ = inject(DestroyRef);

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
      .pipe(takeUntilDestroyed(this.destroy$))
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

        this.boardController.drawPiece(context, this.bagOfPieces.currentPiece);
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
    if (this.boardController.detectedACollision(this.bagOfPieces.currentPiece, ACTION.DOWN))
      this.checkCollisionEffects();
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
        !this.boardController.detectedACollision(this.bagOfPieces.currentPiece, action)
      ) {
        this.bagOfPieces.movePiece(action);
      }
      if (
        action === ACTION.ROTATE &&
        this.bagOfPieces.currentPiece.isMovable
      ) {
        this.bagOfPieces.rotatePiece(this.boardController);
      }

      if (
        this.boardController.detectedACollision(this.bagOfPieces.currentPiece, ACTION.DOWN)
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
    this.boardController.solidifyPieceInBoard(this.bagOfPieces.currentPiece);

    let updateLevel = this.boardController.updateBoardAndScore();
    this.level = updateLevel;
    this.bagOfPieces.recoverNextPiece();
    this.endGame();
    this.nextPiece.next(this.bagOfPieces.nextPiece());
  }

  //Termina el juego al detectar una colision, util al resetear la pieza
  public endGame(): void {
    if (this.boardController.detectedACollision(this.bagOfPieces.currentPiece, ACTION.DOWN)) {
      this.gameOver = true;
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
