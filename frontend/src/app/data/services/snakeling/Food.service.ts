import { inject, Injectable, Renderer2 } from '@angular/core';
import { ramdomNumber } from '../util.service';
import { BoardSizeService } from '@app/data/services/BoardSize.service';
import { Axis } from '@app/data/models/Axis';

@Injectable()
export class FoodService {
  private boardSize = inject(BoardSizeService);
  public foodX: number;
  public foodY: number;

  /**
   * The golden apple, while one is on the board. It is not on the logic
   * board's cells: it is only a position, checked against the head.
   */
  public golden: Axis | null = null;
  /** Time the golden apple has left on the board. */
  public goldenLeftMs = 0;
  /**
   * Whether the apple on the board already brought its golden apple.
   * Each apple brings one at most: another one needs another apple eaten.
   */
  public goldenSpent = false;

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

  /** Puts a golden apple at `at` for `lifeMs`, and spends the apple's. */
  public placeGolden(at: Axis, lifeMs: number): void {
    this.golden = { x: at.x, y: at.y };
    this.goldenLeftMs = lifeMs;
    this.goldenSpent = true;
  }

  /** Takes the golden apple off the board (eaten or gone). */
  public clearGolden(): void {
    this.golden = null;
    this.goldenLeftMs = 0;
  }

  /** A new game: no golden apple, and the first apple may bring one. */
  public resetGolden(): void {
    this.clearGolden();
    this.goldenSpent = false;
  }
}
