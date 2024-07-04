import { Injectable, Renderer2 } from '@angular/core';
import { ramdomNumber } from '../util.service';
import {
  BOARD_HEIGHT_SCREEN,
  BOARD_WIDTH_SCREEN,
} from 'assets/constants/snakeling';

@Injectable({
  providedIn: 'root',
})
export class FoodService {
  public foodX: number;
  public foodY: number;

  constructor() {
    this.foodX = ramdomNumber(false, BOARD_WIDTH_SCREEN);
    this.foodY = ramdomNumber(false, BOARD_HEIGHT_SCREEN);
  }

  /**
   * Cambia la posición de la comida en el tablero del juego.
   *
   * La nueva posición se determina aleatoriamente dentro de los límites del tablero.
   */
  public foodChangePosition(): void {
    this.foodX = ramdomNumber(false, BOARD_WIDTH_SCREEN);
    this.foodY = ramdomNumber(false, BOARD_HEIGHT_SCREEN);
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
