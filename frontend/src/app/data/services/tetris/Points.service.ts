import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PointsService {

  public score: number; 
  public maxScore: number;

  public level: number;
  public maxLevel: number;

  public time: string = '00:00';
  public maxTime: string = '00:00';

  constructor() { 
    this.score = 0;
    this.maxScore = 0;
    this.level = 0;
    this.maxLevel = 0;
  }


  updateMaxPoints(){
    this.updateMaxLevel();
    this.updateMaxScore();
  }
  
  addScore(){
    this.score+=100;
  }
  updateTime(updateTime: string){
    this.time = updateTime;
  }

  updateMaxTime(updateMaxTime: string){
    this.maxTime = updateMaxTime;
  }
  
  updateMaxScore(){
    this.maxScore = this.score > this.maxScore ? this.score : this.maxScore;
  }

  updateMaxLevel(){
    this.maxLevel = this.level > this.maxLevel ? this.level : this.maxLevel;
  }

  updateLevel(level: number){
    this.level = level;
  }

  resetScore(){
    this.score = 0;
  }
  
  resetLevel(){
    this.level = 0;
  }

  

}
