import { Injectable, Renderer2, inject, signal } from '@angular/core';
import { BoardServiceService } from './BoardService.service';
import { SnakeService } from './Snake.service';
import { FoodService } from './Food.service';
import type { SnakelingAction } from './snakeling-controls';
import { ScoreService } from './Score.service';
import { BoardSizeService } from '@app/data/services/BoardSize.service';
import { Axis } from '@app/data/models/Axis';
import {
  GOLDEN_APPLE_CHANCE_PER_STEP,
  GOLDEN_APPLE_LIFE_MS,
} from './scoring';
import {
  hasWalls,
  isTimed,
  SnakelingEnding,
  SnakelingMode,
} from '@app/data/models/snakeling/Mode';

/** How long a Time Attack game lasts. */
export const TIME_ATTACK_MS = 60_000;

/** Something the snake ate on the last step, for the screen to celebrate. */
export interface SnakelingBite {
  at: Axis;
  points: number;
  golden: boolean;
}

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
  /** What the snake ate on the last step, if anything. */
  private _lastBite: SnakelingBite | null = null;

  /** Where the luck of the golden apple comes from; tests replace it. */
  public random: () => number = Math.random;

  private renderer!: Renderer2;
  private boardService = inject(BoardServiceService);
  private snakeService = inject(SnakeService);
  private foodService = inject(FoodService);
  private boardSize = inject(BoardSizeService);
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
    this._lastBite = null;
    if (!this._isGameOver() && !this._isPaused()) {
      // Walls (Classic, Time Attack): the snake stops against the wall,
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

      // The golden apple: points, but the snake does not grow.
      const golden = this.foodService.golden;
      if (
        golden &&
        golden.x === this.snakeService.snakeX &&
        golden.y === this.snakeService.snakeY
      ) {
        const points = this.scoreService.eatGoldenApple();
        this.scoreService.updateMaxScore(this._mode());
        this.foodService.clearGolden();
        this._lastBite = { at: { ...golden }, points, golden: true };
      }

      //Si la serpiente come la comida
      if (this.snakeAndFoodCollision()) {
        this.foodService.removeFood(this.boardDiv, this.renderer);
        const points = this.scoreService.eatApple();
        this.scoreService.updateMaxScore(this._mode());
        this._lastBite = {
          at: { x: this.foodService.foodX, y: this.foodService.foodY },
          points,
          golden: false,
        };
        //Agranda el cuerpo de la serpiente
        this.snakeService.addToSnakeBody({
          x: this.foodService.foodX,
          y: this.foodService.foodY,
        });
        //Actualiza la posicion de la comida hasta que sea en una celda vacia
        do {
          this.foodService.foodChangePosition();
        } while (this.foodCollisionInSnakeBody() || this.foodOnGolden());

        // The new apple may bring a golden apple of its own.
        this.foodService.goldenSpent = false;
        this.foodService.rePaintFood(this.boardDiv, this.renderer);
      }
    }
  }

  /**
   * Lets `elapsedMs` of game time go by: off a Time Attack clock, off the
   * combo, and off the golden apple's life. It is also when the apple on
   * the board may bring its golden apple. It only runs while the game
   * does, so a pause stops all of it.
   */
  public tick(elapsedMs: number): void {
    if (!this._started() || this._isPaused() || this._isGameOver()) return;
    this.scoreService.tick(elapsedMs);
    this.tickGolden(elapsedMs);
    this.tickClock(elapsedMs);
  }

  /**
   * The golden apple leaves when its time is up. While none is on the
   * board, the apple that is, if it has not brought one yet, may bring
   * one now: a roll of the dice each step.
   */
  private tickGolden(elapsedMs: number): void {
    const food = this.foodService;
    if (food.golden) {
      food.goldenLeftMs = Math.max(0, food.goldenLeftMs - elapsedMs);
      if (food.goldenLeftMs === 0) food.clearGolden();
      return;
    }
    if (food.goldenSpent) return;
    if (this.random() >= GOLDEN_APPLE_CHANCE_PER_STEP) return;
    const at = this.freeCellForGolden();
    if (at) food.placeGolden(at, GOLDEN_APPLE_LIFE_MS);
  }

  /**
   * A random cell for the golden apple: not on the snake, not on the
   * apple, and not the cell the head steps into next, so it is never
   * eaten before it was seen. Null if the board has no such cell.
   */
  private freeCellForGolden(): Axis | null {
    const { WIDTH, HEIGHT } = this.boardSize;
    const snake = this.snakeService;
    // In Portal the next cell may be on the other side of the board.
    const ahead = {
      x: ((snake.snakeX + snake.speedSnakeX + WIDTH - 1) % WIDTH) + 1,
      y: ((snake.snakeY + snake.speedSnakeY + HEIGHT - 1) % HEIGHT) + 1,
    };
    const free: Axis[] = [];
    for (let x = 1; x <= WIDTH; x++) {
      for (let y = 1; y <= HEIGHT; y++) {
        const taken =
          snake.verifyCollision(x, y) ||
          (x === this.foodService.foodX && y === this.foodService.foodY) ||
          (x === ahead.x && y === ahead.y);
        if (!taken) free.push({ x, y });
      }
    }
    if (free.length === 0) return null;
    return free[Math.floor(this.random() * free.length)];
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
  private tickClock(elapsedMs: number): void {
    if (!isTimed(this._mode())) return;
    const left = Math.max(0, this._timeLeftMs() - elapsedMs);
    this._timeLeftMs.set(left);
    if (left === 0) {
      this._endedBy.set('time');
      this.isGameOver = true;
    }
  }

  public executeAction(action: SnakelingAction): void {
    if (action === 'up') this.snakeService.moveUp();
    if (action === 'down') this.snakeService.moveDown();
    if (action === 'left') this.snakeService.moveLeft();
    if (action === 'right') this.snakeService.moveRight();
    if (action === 'pause') this.changePause();
  }

  public reset(): void {
    this.snakeService.removeSnake(this.boardDiv, this.renderer);
    this.foodService.removeFood(this.boardDiv, this.renderer);

    this.scoreService.resetScore();
    this.snakeService.resetSnake();
    this.foodService.resetGolden();
    this._lastBite = null;

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

  /** Whether the apple was placed where the golden apple is. */
  private foodOnGolden(): boolean {
    const golden = this.foodService.golden;
    return (
      !!golden &&
      golden.x === this.foodService.foodX &&
      golden.y === this.foodService.foodY
    );
  }

  public foodCollisionInSnakeBody(): boolean {
    return this.snakeService.verifyCollision(
      this.foodService.foodX,
      this.foodService.foodY
    );
  }

  /** What the snake ate on the last step, or null. */
  public get lastBite(): SnakelingBite | null {
    return this._lastBite;
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
