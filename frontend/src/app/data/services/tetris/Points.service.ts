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
    this.level = 0;

    let maxScoreS = localStorage.getItem('tetris-maxScore'); 
    let maxLevelS = localStorage.getItem('tetris-maxLevel'); 
    let maxTimeS = localStorage.getItem('tetris-maxTime');
    this.maxScore = maxScoreS ? parseInt(maxScoreS) : 0;
    this.maxLevel = maxLevelS ? parseInt(maxLevelS) : 1;
    this.maxTime = maxTimeS ? maxTimeS : '00:00';
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
    localStorage.setItem('tetris-maxTime', this.maxTime);
  }
  
  updateMaxScore(){
    if(this.score > this.maxScore){
      this.maxScore = this.score;
      localStorage.setItem('tetris-maxScore', JSON.stringify(this.maxScore));
    }
  }

  updateMaxLevel(){
    if(this.level > this.maxLevel){
      this.maxLevel = this.level;
      localStorage.setItem('tetris-maxLevel', JSON.stringify(this.maxLevel));
    }
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
