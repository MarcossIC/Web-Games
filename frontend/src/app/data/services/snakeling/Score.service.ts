import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ScoreService {

  public score: number;
  public maxScore: number;

  constructor() { 
    this.score = 0;
    this.maxScore = 0;
  }

  updateMaxScore(){
    this.maxScore = this.score > this.maxScore ? this.score : this.maxScore;
  }

  updateScore(){
    this.score += 8;
  }

  resetScore(){
    this.score = 0;
  }

}
