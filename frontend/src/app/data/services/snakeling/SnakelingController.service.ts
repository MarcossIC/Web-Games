import { Injectable, Renderer2, inject } from '@angular/core';
import { BoardServiceService } from './BoardService.service';
import { ACTIONS } from 'assets/constants/snakeling';
import { SnakeService } from './Snake.service';
import { FoodService } from './Food.service';
import { ACTION } from '@app/data/models/snakeling/Actions';
import { ScoreService } from './Score.service';

@Injectable({
  providedIn: 'root'
})
export class SnakelingControllerService {

  private _isPaused: boolean = true;
  public _isGameOver: boolean = false;

  private renderer!: Renderer2;
  private boardService: BoardServiceService = inject(BoardServiceService);
  private snakeService: SnakeService = inject(SnakeService);
  private foodService: FoodService = inject(FoodService);
  public scoreService: ScoreService = inject(ScoreService);

  private boardDiv: any;

  constructor() { }

  public initGame(boardDiv: any, renderer: Renderer2): void{
    this.renderer = renderer;
    this.boardDiv = boardDiv;
    this.boardService.rePaintBoard(this.boardDiv, this.renderer);
    this.snakeService.rePaintSnake(this.boardDiv, this.renderer);
    this.foodService.rePaintFood(this.boardDiv, this.renderer);

    this._isPaused = true;
    this._isGameOver = false;
  }

  public runGame(): void{
    if(!this._isGameOver && !this._isPaused){
      this.snakeService.removeSnake(this.boardDiv, this.renderer);
      this.snakeService.moveBody();
      this.snakeService.moveSnake();
      const isCollision =this.snakeService.rePaintSnake(this.boardDiv, this.renderer);
  
      if(isCollision) this._isGameOver = true;
      
      if(this.snakeAndFoodCollision()){
        this.foodService.removeFood(this.boardDiv, this.renderer);
        this.scoreService.updateScore();
        this.scoreService.updateMaxScore();
        this.snakeService.addToSnakeBody({x: this.foodService.foodX, y: this.foodService.foodY});
        do{
          this.foodService.foodChangePosition();
        } while(this.foodCollisionInSnakeBody());
        
        this.foodService.rePaintFood(this.boardDiv, this.renderer);
        
      }
    }
  }

  snakeAndFoodCollision(): boolean{
    return this.snakeService.snakeX === this.foodService.foodX && 
           this.snakeService.snakeY === this.foodService.foodY;
  }

  foodCollisionInSnakeBody(): boolean{
    return this.snakeService.verifyCollision(this.foodService.foodX, this.foodService.foodY);
  }

  public executeAction(key: string): void{
    const action = ACTIONS[key];

    if(action === ACTION.UP)this.snakeService.moveUp();
    if(action === ACTION.DOWN) this.snakeService.moveDown();
    if(action === ACTION.LEFT)this.snakeService.moveLeft();
    if(action === ACTION.RIGHT) this.snakeService.moveRight();
    if(action === ACTION.PAUSE) this.changePause();
  }

  reset(): void{
    this.snakeService.removeSnake(this.boardDiv, this.renderer);
    this.foodService.removeFood(this.boardDiv, this.renderer);
    this.scoreService.resetScore();
    this.snakeService.resetSnake();
    this.foodService.foodChangePosition();

    this.snakeService.rePaintSnake(this.boardDiv, this.renderer);
    this.foodService.rePaintFood(this.boardDiv, this.renderer);
    this._isPaused = false;
    this._isGameOver = false;
  }

  public changePause(): void{
    this._isPaused = !this._isPaused;
  }

  get isPaused(){
    return this._isPaused;
  }

  get isGameOver(){
    return this._isGameOver;
  }
}
