import { inject, Injectable, Renderer2 } from '@angular/core';
import { ramdomNumber } from '../util.service';
import { BoardSizeService } from '@app/data/services/BoardSize.service';

@Injectable()
export class FoodService {
  private boardSize = inject(BoardSizeService);
  public foodX: number;
  public foodY: number;

  constructor() {
    this.boardSize.typeToSnake();
    this.foodX = ramdomNumber(false, this.boardSize.WIDTH);
    this.foodY = ramdomNumber(false, this.boardSize.HEIGHT);
  }

  /**
   * Cambia la posición de la comida en el tablero del juego.
   *
   * La nueva posición se determina aleatoriamente dentro de los límites del tablero.
   */
  public foodChangePosition(): void {
    this.foodX = ramdomNumber(false, this.boardSize.WIDTH);
    this.foodY = ramdomNumber(false, this.boardSize.HEIGHT);
  }

  /**
   * Remueve la apariencia de comida de la celda actual
   * Util cuando la serpiente ya paso por esta posicion (Significando que ya la comio)
   */
  public removeFood(boardDiv: HTMLDivElement, renderer: Renderer2): void {
    const div = boardDiv.querySelector(`.cell-${this.foodX}-${this.foodY}`);
    renderer.removeClass(div, 'food');
  }

  /**
   * Re-pinta la celda del tablero donde se encuentra la comida.
   *
   * Para la logica del juego la "comida" es solo una posicion designada en el tablero,
   * entonces a esta posicion se le agrega una clase para darle apariencia de comida.
   *
   * @param boardDiv - El elemento HTML que representa el tablero del juego.
   * @param renderer - El servicio Renderer2 de Angular para manipular el DOM.
   */
  public rePaintFood(boardDiv: HTMLDivElement, renderer: Renderer2): void {
    const div = boardDiv.querySelector(`.cell-${this.foodX}-${this.foodY}`);

    if (div) {
      renderer.addClass(div, 'food');
    }
  }
}
