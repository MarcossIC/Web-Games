import { Injectable, Renderer2 } from '@angular/core';
import { ramdomNumber } from '../util.service';
import { BOARD_HEIGHT_SCREEN, BOARD_WIDTH_SCREEN, NEXT_POSITION, NOT_MOVE, PREVIOUS_POSITION } from 'assets/constants/snakeling';
import { Axis } from '@app/data/models/Axis';

@Injectable({
  providedIn: 'root'
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

  private initSnakeBody(): void{
    this.snakeBody.splice(0);
    for (let i = 0; i < 3; i++) {
      let xValue = this.snakeX - i;

      if (this.snakeX === BOARD_WIDTH_SCREEN && xValue <= 0) { xValue = BOARD_WIDTH_SCREEN + i + 1; }

      else if (this.snakeX === 1 && xValue > BOARD_WIDTH_SCREEN) { xValue = i; } 
      
      else { xValue = xValue <= 0 ? BOARD_WIDTH_SCREEN + 1 - i : xValue > BOARD_WIDTH_SCREEN ? 1 - i : xValue; }

      this.snakeBody.push([xValue, this.snakeY]);
    }
  }

  public resetSnake(): void{
    this.speedSnakeX = 1;
    this.speedSnakeY = 0;
    this.snakeX = ramdomNumber(false, BOARD_WIDTH_SCREEN);
    this.snakeY = ramdomNumber(false, BOARD_HEIGHT_SCREEN);  

    this.initSnakeBody();
  }

  public addToSnakeBody(axis: Axis): void{
    this.snakeBody.push([axis.x, axis.y]);
  }

  public verifyCollision(x: number, y: number): boolean{
    return this.snakeBody.some(([snakeX, snakeY]) => snakeX === x && snakeY === y);
  }

  removeSnake(boardDiv: HTMLDivElement, renderer: Renderer2){
    this.snakeBody.forEach(([x, y]) => 
      renderer.removeClass(boardDiv.querySelector(`.cell-${x}-${y}`), 'head')
    );
  }

  public moveBody(): void{
    this.snakeBody = this.snakeBody.map((_, i) => (i > 0 ? this.snakeBody[i - 1] : this.snakeBody[i]));
  }

  public rePaintSnake(boardDiv: HTMLDivElement, renderer: Renderer2): boolean{
    return this.snakeBody.some(([x, y], i) => {
      renderer.addClass(boardDiv.querySelector(`.cell-${x}-${y}`), 'head');
      return i !== 0 && this.snakeBody[0][1] === y && this.snakeBody[0][0] === x;
    });
  }

  public moveSnake(): void{
    this.snakeX+=this.speedSnakeX;
    this.snakeY+=this.speedSnakeY;

    if(this.snakeX === BOARD_WIDTH_SCREEN+NEXT_POSITION) this.snakeX = 1;
    else if(this.snakeX === 0) this.snakeX = BOARD_WIDTH_SCREEN;

    if(this.snakeY === BOARD_HEIGHT_SCREEN+NEXT_POSITION) this.snakeY = 1;
    else if(this.snakeY === 0) this.snakeY = BOARD_HEIGHT_SCREEN;

    this.snakeBody[0] = [this.snakeX, this.snakeY];
  }

  public moveUp(): void{
    if(this.speedSnakeY !== NEXT_POSITION){
      this.speedSnakeY = PREVIOUS_POSITION;
      this.speedSnakeX = NOT_MOVE;
    }
  }

  public moveDown(): void{
    if(this.speedSnakeY !== PREVIOUS_POSITION){
      this.speedSnakeY = NEXT_POSITION;
      this.speedSnakeX = NOT_MOVE;
    }
  }

  public moveLeft(): void{
    if(this.speedSnakeX !== NEXT_POSITION){
      this.speedSnakeX = PREVIOUS_POSITION;
      this.speedSnakeY = NOT_MOVE;
    }
  }

  public moveRight(): void{
    if(this.speedSnakeX !== PREVIOUS_POSITION){
      this.speedSnakeX = NEXT_POSITION;
      this.speedSnakeY = NOT_MOVE;
    }
  }
}
