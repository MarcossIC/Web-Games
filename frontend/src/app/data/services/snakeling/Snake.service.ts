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

    this.snakeBody[0] = [this.snakeX,  this.snakeY];
    this.snakeBody[1] = [this.snakeX-1,  this.snakeY];
    this.snakeBody[2] = [this.snakeX-2,  this.snakeY];
  }

  resetSnake(){
    this.snakeX = ramdomNumber(false, BOARD_WIDTH_SCREEN);
    this.snakeY = ramdomNumber(false, BOARD_HEIGHT_SCREEN);  

    this.snakeBody.splice(0);
    
    this.snakeBody[0] = [this.snakeX,  this.snakeY];
    this.snakeBody[1] = [this.snakeX-1,  this.snakeY];
    this.snakeBody[2] = [this.snakeX-2,  this.snakeY];
  }

  addToSnakeBody(axis: Axis){
    this.snakeBody.push([axis.x, axis.y]);
  }

  verifyCollision(x: number, y: number): boolean{
    const snakeBodyLenght = this.snakeBody.length;
    for(let i = 0; i < snakeBodyLenght; i++){
     if(this.snakeBody[i][0] === x && this.snakeBody[i][1] === y) return true;
    }
    return false;
  }

  removeSnake(boardDiv: any, renderer: Renderer2){
    const snakeBodyLenght = this.snakeBody.length;
    for(let i = 0; i < snakeBodyLenght; i++){
      const div = boardDiv.querySelector(`.cell-${this.snakeBody[i][0]}-${this.snakeBody[i][1]}`); 
      
      renderer.removeClass(div, 'head');
    }
  }

  moveBody(){
    const snakeBodyLenght = this.snakeBody.length;
    for(let i = snakeBodyLenght-1; i > 0; i--){
      this.snakeBody[i] = this.snakeBody[i-1];
    }
  }

  rePaintSnake(boardDiv: any, renderer: Renderer2): boolean{
    const snakeBodyLenght = this.snakeBody.length;

    for(let i = 0; i < snakeBodyLenght; i++){
      const div = boardDiv.querySelector(`.cell-${this.snakeBody[i][0]}-${this.snakeBody[i][1]}`); 

      renderer.addClass(div, 'head');

      if(
        i !== 0 && 
        this.snakeBody[0][1] === this.snakeBody[i][1] && 
        this.snakeBody[0][0] === this.snakeBody[i][0]){
        return true;
      } 
    }
    return false;
  }

  moveSnake(){
    this.snakeX+=this.speedSnakeX;
    this.snakeY+=this.speedSnakeY;

    if(this.snakeX === BOARD_WIDTH_SCREEN+NEXT_POSITION){
        this.snakeX = 1;
    } else if(this.snakeX === 0){
        this.snakeX = BOARD_WIDTH_SCREEN;
    }
    if(this.snakeY === BOARD_HEIGHT_SCREEN+NEXT_POSITION){
        this.snakeY = 1;
    } else if(this.snakeY === 0){
        this.snakeY = BOARD_HEIGHT_SCREEN;
    }

    this.snakeBody[0] = [this.snakeX, this.snakeY];
  }

  moveUp(){
    if(this.speedSnakeY !== NEXT_POSITION){
      this.speedSnakeY = PREVIOUS_POSITION;
      this.speedSnakeX = NOT_MOVE;
    }
  }

  moveDown(){
    if(this.speedSnakeY !== PREVIOUS_POSITION){
      this.speedSnakeY = NEXT_POSITION;
      this.speedSnakeX = NOT_MOVE;
    }
  }

  moveLeft(){
    if(this.speedSnakeX !== NEXT_POSITION){
      this.speedSnakeX = PREVIOUS_POSITION;
      this.speedSnakeY = NOT_MOVE;
    }
    
  }

  moveRight(){
    if(this.speedSnakeX !== PREVIOUS_POSITION){
      this.speedSnakeX = NEXT_POSITION;
      this.speedSnakeY = NOT_MOVE;
    }
  }
}
