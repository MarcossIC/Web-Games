import { Injectable, Renderer2, inject, signal } from '@angular/core';
import { BoardServiceService } from './BoardService.service';
import { ACTIONS } from 'assets/constants/snakeling';
import { SnakeService } from './Snake.service';
import { FoodService } from './Food.service';
import { ACTION } from '@app/data/models/snakeling/Actions';
import { ScoreService } from './Score.service';
import {
  hasWalls,
  isTimed,
  SnakelingEnding,
  SnakelingMode,
} from '@app/data/models/snakeling/Mode';

/** How long a Time Attack game lasts. */
export const TIME_ATTACK_MS = 60_000;

@Injectable()
export class SnakelingControllerService {
  private _isPaused = signal(true);
  private _isGameOver = signal(false);
  private _mode = signal<SnakelingMode>('portal');
  /** False on the opening menu, true once a mode was picked. */
  private _started = signal(false);
  /** What ended the last game: a wall, the snake's own body, or the clock. */
  private _endedBy = signal<SnakelingEnding>('tail');
  /** Time Attack: what is left of the minute. */
  private _timeLeftMs = signal(TIME_ATTACK_MS);

  private renderer!: Renderer2;
  private boardService = inject(BoardServiceService);
  private snakeService = inject(SnakeService);
  private foodService = inject(FoodService);
  public scoreService = inject(ScoreService);

  private boardDiv!: HTMLDivElement;

  constructor() {}

  private initSnakeAndFood(): void {
    this.snakeService.rePaintSnake(this.boardDiv, this.renderer);
    this.foodService.rePaintFood(this.boardDiv, this.renderer);
  }

  public initGame(boardDiv: HTMLDivElement, renderer: Renderer2): void {
    this.renderer = renderer;
    this.boardDiv = boardDiv;
    this.boardService.rePaintBoard(this.boardDiv, this.renderer);
    this.initSnakeAndFood();
  }

  /**
   * Ejecuta un ciclo del juego Snake.
   *
   * Realiza las siguientes acciones si el juego está activo:
   * - Actualiza la posición de la serpiente.
   * - Verifica colisiones con las paredes (modo clásico) o consigo misma.
   * - Detecta y maneja la colisión con la comida.
   * - Actualiza la puntuación y reposiciona la comida si es necesario.
   *
   * El juego termina si se detecta una colisión de la serpiente.
   */
  public runGame(): void {
    if (!this._isGameOver() && !this._isPaused()) {
      // Classic: the edges are walls. The snake stops against the wall,
      // where it can be seen, instead of stepping out of the board.
      if (
        hasWalls(this._mode()) &&
        this.snakeService.nextStepLeavesBoard()
      ) {
        this._endedBy.set('wall');
        this.isGameOver = true;
        return;
      }
      this.snakeService.removeSnake(this.boardDiv, this.renderer);
      this.snakeService.moveBody();
      this.snakeService.moveSnake();
      const isCollision = this.snakeService.rePaintSnake(
        this.boardDiv,
        this.renderer
      );

      //Si la serpiente colisiona con su propio cuerpo
      if (isCollision) {
        this._endedBy.set('tail');
        this.isGameOver = true;
      }

      //Si la serpiente come la comida
      if (this.snakeAndFoodCollision()) {
        this.foodService.removeFood(this.boardDiv, this.renderer);
        this.scoreService.updateScore();
        this.scoreService.updateMaxScore(this._mode());
        //Agranda el cuerpo de la serpiente
        this.snakeService.addToSnakeBody({
          x: this.foodService.foodX,
          y: this.foodService.foodY,
        });
        //Actualiza la posicion de la comida hasta que sea en una celda vacia
        do {
          this.foodService.foodChangePosition();
        } while (this.foodCollisionInSnakeBody());

        this.foodService.rePaintFood(this.boardDiv, this.renderer);
      }
    }
  }

  /**
   * Time Attack: takes `elapsedMs` of game time off the clock, and ends
   * the game when the minute is up. It only runs while the game does, so
   * a pause stops the clock.
   *
   * The clock counts game steps, not the time on the wall: if the browser
   * slows the game down (a tab in the background), the minute slows with
   * it, and a player always gets the same number of steps.
   */
  public tickClock(elapsedMs: number): void {
    if (!isTimed(this._mode()) || this._isPaused() || this._isGameOver()) {
      return;
    }
    const left = Math.max(0, this._timeLeftMs() - elapsedMs);
    this._timeLeftMs.set(left);
    if (left === 0) {
      this._endedBy.set('time');
      this.isGameOver = true;
    }
  }

  public executeAction(key: string): void {
    const action = ACTIONS[key];
    if (action === ACTION.UP) this.snakeService.moveUp();
    if (action === ACTION.DOWN) this.snakeService.moveDown();
    if (action === ACTION.LEFT) this.snakeService.moveLeft();
    if (action === ACTION.RIGHT) this.snakeService.moveRight();
    if (action === ACTION.PAUSE) this.changePause();
  }

  public reset(): void {
    this.snakeService.removeSnake(this.boardDiv, this.renderer);
    this.foodService.removeFood(this.boardDiv, this.renderer);

    this.scoreService.resetScore();
    this.snakeService.resetSnake();

    do {
      this.foodService.foodChangePosition();
    } while (this.foodCollisionInSnakeBody());
    this.initSnakeAndFood();
    this._timeLeftMs.set(TIME_ATTACK_MS);
    this._isPaused.set(false);
    this.isGameOver = false;
  }

  /** Starts a new game in `mode`, from the menu. */
  public start(mode: SnakelingMode): void {
    this._mode.set(mode);
    this._started.set(true);
    this.reset();
  }

  /** Leaves the game for the opening menu, where a mode is picked. */
  public backToMenu(): void {
    this.reset();
    this._isPaused.set(true);
    this._started.set(false);
  }

  public changePause(): void {
    // On the opening menu there is no game to resume: a mode starts one.
    if (!this._started()) return;
    const current = this._isPaused();
    this._isPaused.set(!current);
  }

  public snakeAndFoodCollision(): boolean {
    return (
      this.snakeService.snakeX === this.foodService.foodX &&
      this.snakeService.snakeY === this.foodService.foodY
    );
  }

  public foodCollisionInSnakeBody(): boolean {
    return this.snakeService.verifyCollision(
      this.foodService.foodX,
      this.foodService.foodY
    );
  }

  /** The mode being played, or the last one played. */
  public get mode(): SnakelingMode {
    return this._mode();
  }

  /** False on the opening menu, true once a game is going. */
  public get started(): boolean {
    return this._started();
  }

  /** What ended the last game. */
  public get endedBy(): SnakelingEnding {
    return this._endedBy();
  }

  /** Time Attack: the milliseconds left in the minute. */
  public get timeLeftMs(): number {
    return this._timeLeftMs();
  }

  /** The best score of the mode being played. */
  public get bestScore(): number {
    return this.scoreService.bestFor(this._mode());
  }

  public get isPaused(): boolean {
    return this._isPaused();
  }

  public get isGameOver(): boolean {
    return this._isGameOver();
  }
  public set isGameOver(updated: boolean) {
    this._isGameOver.set(updated);
  }
}
