import { Injectable, Renderer2 } from '@angular/core';
import { fillMatrix } from '../util.service';
import { BOARD_HEIGHT_SCREEN, BOARD_WIDTH_SCREEN } from 'assets/constants/snakeling';

@Injectable({
  providedIn: 'root'
})
export class BoardServiceService {

  private board: number[][];

  constructor() { 
    this.board = fillMatrix(BOARD_HEIGHT_SCREEN, BOARD_WIDTH_SCREEN, 0) as number[][];
  }

  public rePaintBoard(boardDiv: HTMLDivElement, renderer: Renderer2): void{
    this.board.forEach((col, colY)=>
      col.forEach((cell, rowX)=> this.addCellToBoard(boardDiv, renderer, colY, rowX))
    );
  }

  public addCellToBoard(boardDiv: HTMLDivElement, renderer: Renderer2, colY: number, rowX: number): void{
    const div = renderer.createElement('div');
    const isEvenCell = (colY+rowX) % 2 === 0;

    renderer.addClass(div, isEvenCell ? 'even-cell' : 'odd-cell');

    renderer.addClass(div, `cell-${colY+1}-${rowX+1}`);

    renderer.setStyle(div, 'grid-column', `${colY + 1}`);
    renderer.setStyle(div, 'grid-row', `${rowX + 1}`);
    renderer.appendChild(boardDiv, div);
  }
}
