import { Injectable, Renderer2 } from '@angular/core';
import { ramdomNumber } from '../util.service';
import {
  BOARD_HEIGHT_SCREEN,
  BOARD_WIDTH_SCREEN,
  NEXT_POSITION,
  NOT_MOVE,
  PREVIOUS_POSITION,
} from 'assets/constants/snakeling';
import { Axis } from '@app/data/models/Axis';

@Injectable({
  providedIn: 'root',
})
export class SnakeService {
  public snakeX: number;
  public snakeY: number;
  public speedSnakeX: number = 1;
  public speedSnakeY: number = 0;

  private snakeBody: number[][] = [];
  constructor() {
    this.snakeX = ramdomNumber(false, BOARD_WIDTH_SCREEN);
    this.snakeY = ramdomNumber(false, BOARD_HEIGHT_SCREEN);

    this.initSnakeBody();
  }

  /**
   * Inicializa el cuerpo de la serpiente en su posición inicial.
   *
   * La función establece las primeras tres posiciones del cuerpo de la serpiente en una línea horizontal,
   * empezando desde la posición actual de la cabeza de la serpiente y extendiéndose hacia la izquierda.
   * La posición del cuerpo se ajusta correctamente cuando la serpiente está cerca de los bordes del tablero.
   */
  private initSnakeBody(): void {
    // Limpia el cuerpo actual de la serpiente
    this.snakeBody.splice(0);
    for (let i = 0; i < 3; i++) {
      let xValue = this.snakeX - i;

      // Ajusta la posición del cuerpo cuando la serpiente está en los bordes del tablero
      if (xValue <= 0) {
        xValue += BOARD_WIDTH_SCREEN;
      } else if (xValue > BOARD_WIDTH_SCREEN) {
        xValue -= BOARD_WIDTH_SCREEN;
      }

      this.snakeBody.push([xValue, this.snakeY]);
    }
  }

  public resetSnake(): void {
    this.speedSnakeX = 1;
    this.speedSnakeY = 0;
    this.snakeX = ramdomNumber(false, BOARD_WIDTH_SCREEN);
    this.snakeY = ramdomNumber(false, BOARD_HEIGHT_SCREEN);

    this.initSnakeBody();
  }

  public addToSnakeBody(axis: Axis): void {
    this.snakeBody.push([axis.x, axis.y]);
  }

  public verifyCollision(x: number, y: number): boolean {
    return this.snakeBody.some(
      ([snakeX, snakeY]) => snakeX === x && snakeY === y
    );
  }

  public removeSnake(boardDiv: HTMLDivElement, renderer: Renderer2) {
    this.snakeBody.forEach(([x, y]) =>
      renderer.removeClass(boardDiv.querySelector(`.cell-${x}-${y}`), 'head')
    );
  }

  public moveBody(): void {
    this.snakeBody = this.snakeBody.map((_, i) =>
      i > 0 ? this.snakeBody[i - 1] : this.snakeBody[i]
    );
  }

  /**
   * Redibuja la serpiente en el tablero de juego.
   *
   * La función añade la clase 'head' a la celda correspondiente a la nueva posición de la cabeza de la serpiente
   * y verifica si la cabeza de la serpiente colisiona con alguna parte de su cuerpo.
   *
   * @param boardDiv El elemento HTML que representa el tablero de juego.
   * @param renderer El servicio Renderer2 para manipular elementos del DOM.
   * @returns true si la cabeza de la serpiente colisiona con su cuerpo, false en caso contrario.
   */
  public rePaintSnake(boardDiv: HTMLDivElement, renderer: Renderer2): boolean {
    return this.snakeBody.some(([x, y], i) => {
      renderer.addClass(boardDiv.querySelector(`.cell-${x}-${y}`), 'head');
      return (
        i !== 0 && this.snakeBody[0][1] === y && this.snakeBody[0][0] === x
      );
    });
  }

  /**
   * Mueve la serpiente en el tablero de juego según la velocidad actual.
   *
   * La función actualiza la posición de la cabeza de la serpiente basado en su velocidad,
   * y maneja la lógica de teletransportación de la serpiente cuando alcanza los bordes del tablero.
   */
  public moveSnake(): void {
    // Actualiza la posición de la cabeza de la serpiente según la velocidad
    this.snakeX =
      (this.snakeX + this.speedSnakeX + BOARD_WIDTH_SCREEN) %
        BOARD_WIDTH_SCREEN || BOARD_WIDTH_SCREEN;

    this.snakeY =
      (this.snakeY + this.speedSnakeY + BOARD_HEIGHT_SCREEN) %
        BOARD_HEIGHT_SCREEN || BOARD_HEIGHT_SCREEN;

    // Actualiza la posición de la cabeza de la serpiente en el cuerpo de la serpiente
    this.snakeBody[0] = [this.snakeX, this.snakeY];
  }

  public moveUp(): void {
    if (this.speedSnakeY !== NEXT_POSITION) {
      this.speedSnakeY = PREVIOUS_POSITION;
      this.speedSnakeX = NOT_MOVE;
    }
  }

  public moveDown(): void {
    if (this.speedSnakeY !== PREVIOUS_POSITION) {
      this.speedSnakeY = NEXT_POSITION;
      this.speedSnakeX = NOT_MOVE;
    }
  }

  public moveLeft(): void {
    if (this.speedSnakeX !== NEXT_POSITION) {
      this.speedSnakeX = PREVIOUS_POSITION;
      this.speedSnakeY = NOT_MOVE;
    }
  }

  public moveRight(): void {
    if (this.speedSnakeX !== PREVIOUS_POSITION) {
      this.speedSnakeX = NEXT_POSITION;
      this.speedSnakeY = NOT_MOVE;
    }
  }
}
