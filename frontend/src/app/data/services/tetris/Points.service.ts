import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PointsService {

  public score: number; 
  public maxScore: number;

  public countLines: number;
  public maxCountLine: number;

  public time: string = '00:00';
  public maxTime: string = '00:00';

  constructor() { 
    this.score = 0;
    this.maxScore = 0;
    this.countLines = 0;
    this.maxCountLine = 0;
  }


  updatePoints(){
    this.addScore();
    this.updateCountLines();
    this.updateMaxCountLine();
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

  updateMaxCountLine(){
    this.maxCountLine = this.countLines > this.maxCountLine ? this.countLines : this.maxCountLine;
  }

  updateCountLines(){
    this.countLines++;
  }

  resetScore(){
    this.score = 0;
  }
  
  resetCountLine(){
    this.countLines = 0;
  }



}
