import { Injectable, Renderer2 } from '@angular/core';
import { ramdomNumber } from '../util.service';
import { BOARD_HEIGHT_SCREEN, BOARD_WIDTH_SCREEN } from 'assets/constants/snakeling';

@Injectable({
  providedIn: 'root'
})
export class FoodService {
  public foodX: number;
  public foodY: number;

  constructor() { 
    this.foodX = ramdomNumber(false, BOARD_WIDTH_SCREEN);
    this.foodY = ramdomNumber(false, BOARD_HEIGHT_SCREEN);
  }

  public foodChangePosition(): void{
    this.foodX = ramdomNumber(false, BOARD_WIDTH_SCREEN);
    this.foodY = ramdomNumber(false, BOARD_HEIGHT_SCREEN);
  }

  public removeFood(boardDiv: HTMLDivElement, renderer: Renderer2): void{
    const div = boardDiv.querySelector(`.cell-${this.foodX}-${this.foodY}`); // Ajusta el formato
    renderer.removeClass(div, 'food');
  }

  public rePaintFood(boardDiv: HTMLDivElement, renderer: Renderer2): void{
    const div = boardDiv.querySelector(`.cell-${this.foodX}-${this.foodY}`); // Ajusta el formato

    if (div) {
      renderer.addClass(div, 'food');
    } else {
      console.error(`Elemento no encontrado con ID: ${this.foodY}-${this.foodX}`);
    }
  }

}
