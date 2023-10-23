import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ScoreService {

  public score: number;
  public maxScore: number;

  constructor() { 
    this.score = 0;
    let max = localStorage.getItem('snakeling-maxScore');
    this.maxScore = max ? parseInt(max) : 0;
  }

  public updateMaxScore(): void{
    if(this.score > this.maxScore){
      this.maxScore = this.score;
      localStorage.setItem('snakeling-maxScore', JSON.stringify(this.maxScore));
    }
  }

  public updateScore(): void{
    this.score += 8;
  }

  public resetScore(): void{
    this.score = 0;
  }
}
