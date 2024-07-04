import { Injectable, Renderer2, inject } from '@angular/core';
import { BoardServiceService } from './BoardService.service';
import { ACTIONS } from 'assets/constants/snakeling';
import { SnakeService } from './Snake.service';
import { FoodService } from './Food.service';
import { ACTION } from '@app/data/models/snakeling/Actions';
import { ScoreService } from './Score.service';

@Injectable({
  providedIn: 'root',
})
export class SnakelingControllerService {
  private _isPaused: boolean = true;
  public _isGameOver: boolean = false;

  private renderer!: Renderer2;
  private boardService: BoardServiceService = inject(BoardServiceService);
  private snakeService: SnakeService = inject(SnakeService);
  private foodService: FoodService = inject(FoodService);
  public scoreService: ScoreService = inject(ScoreService);

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
   * - Verifica colisiones con los bordes o consigo misma.
   * - Detecta y maneja la colisión con la comida.
   * - Actualiza la puntuación y reposiciona la comida si es necesario.
   *
   * El juego termina si se detecta una colisión de la serpiente.
   */
  public runGame(): void {
    if (!this._isGameOver && !this._isPaused) {
      this.snakeService.removeSnake(this.boardDiv, this.renderer);
      this.snakeService.moveBody();
      this.snakeService.moveSnake();
      const isCollision = this.snakeService.rePaintSnake(
        this.boardDiv,
        this.renderer
      );

      //Si la serpiente colisiona con su propio cuerpo
      if (isCollision) this._isGameOver = true;

      //Si la serpiente come la comida
      if (this.snakeAndFoodCollision()) {
        this.foodService.removeFood(this.boardDiv, this.renderer);
        this.scoreService.updateScore();
        this.scoreService.updateMaxScore();
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

    this.foodService.foodChangePosition();
    this.initSnakeAndFood();
    this._isPaused = false;
    this._isGameOver = false;
  }

  public changePause(): void {
    this._isPaused = !this._isPaused;
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

  public get isPaused(): boolean {
    return this._isPaused;
  }

  public get isGameOver(): boolean {
    return this._isGameOver;
  }
}
