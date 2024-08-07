import { inject, Injectable, Renderer2 } from '@angular/core';
import { fillMatrix } from '../util.service';

import { BoardSizeService } from '@app/data/services/BoardSize.service';

@Injectable()
export class BoardServiceService {
  private boardSize = inject(BoardSizeService);
  private board: number[][];

  constructor() {
    this.boardSize.typeToSnake();
    this.board = fillMatrix(
      this.boardSize.HEIGHT,
      this.boardSize.WIDTH,
      0
    ) as number[][];
  }

  public rePaintBoard(boardDiv: HTMLDivElement, renderer: Renderer2): void {
    this.board.forEach((col, colY) =>
      col.forEach((cell, rowX) =>
        this.addCellToBoard(boardDiv, renderer, colY, rowX)
      )
    );
  }

  /**
   * Añade una celda al tablero del juego.
   *
   * @param boardDiv - El elemento HTML que representa el tablero del juego.
   * @param renderer - El servicio Renderer2 de Angular para manipular el DOM.
   * @param colY - La columna (coordenada Y) donde se añadirá la celda.
   * @param rowX - La fila (coordenada X) donde se añadirá la celda.
   */
  public addCellToBoard(
    boardDiv: HTMLDivElement,
    renderer: Renderer2,
    colY: number,
    rowX: number
  ): void {
    const div = renderer.createElement('div');
    const isEvenCell = (colY + rowX) % 2 === 0;

    renderer.addClass(div, isEvenCell ? 'even-cell' : 'odd-cell');

    renderer.addClass(div, `cell-${colY + 1}-${rowX + 1}`);

    renderer.setStyle(div, 'grid-column', `${colY + 1}`);
    renderer.setStyle(div, 'grid-row', `${rowX + 1}`);
    renderer.appendChild(boardDiv, div);
  }
}
