import { Component, OnDestroy, OnInit } from '@angular/core';
import { PointsService } from '@app/data/services/tetris/Points.service';
import { TetrisControllerService } from '@app/data/services/tetris/TetrisController.service';
import { destroy } from '@app/data/services/util.service';
import { Observable, Subscription, interval } from 'rxjs';

@Component({
  selector: 'chronometer',
  templateUrl: './chronometer.component.html',
  styleUrls: ['./chronometer.component.css']
})
export class ChronometerComponent implements OnInit, OnDestroy {

  private seconds = 0;
  private minutes = 0;
  public time: string = '00:00';
  private cronometro$: Observable<number>;
  private timer$!: Subscription;
  protected maxSecond: number = 0;
  public maxMinute: number = 0;
  public isUpdated: boolean = true;
  private destroy$ = destroy();

  constructor(private point: PointsService, private controller: TetrisControllerService) {
    this.cronometro$ = interval(1000);
  }

  ngOnInit(): void {
    this.timer$ = this.cronometro$.pipe(this.destroy$()).subscribe(() => {
      if(!this.controller.gameOver && !this.controller.isPaused){
        this.isUpdated = true;
        this.seconds++;
        if (this.seconds >= 60) {
          this.seconds = 0;
          this.minutes++;
        }
        this.updateTime();

      } else if(this.controller.gameOver && this.isUpdated){
        this.updateMaximumsTimes();
        this.reset();
        this.isUpdated = false;
      }
      
    });
  }

  ngOnDestroy(): void {
    this.timer$.unsubscribe();
    this.cronometro$.pipe();
  }

  private updateTime() {
    const minutosStr = this.formatTime(this.minutes);
    const segundosStr = this.formatTime(this.seconds);
    this.time = minutosStr + ':' + segundosStr;
  }

  updateMaximumsTimes(){
    
    let minutosStr = this.formatTime(this.minutes);
    let segundosStr = this.formatTime(this.seconds);
    this.point.updateTime( minutosStr + ':' + segundosStr );

    if(this.maxMinute < this.minutes){
      minutosStr = this.formatTime(this.minutes);
      segundosStr = this.formatTime(this.seconds);
      this.maxMinute = this.minutes;
      this.maxSecond = this.seconds;
      this.point.updateMaxTime( minutosStr + ':' + segundosStr);
    } else if(this.maxMinute === this.minutes && this.maxSecond < this.seconds){
      minutosStr = this.formatTime(this.minutes);
      segundosStr = this.formatTime(this.seconds);
      this.maxSecond = this.seconds;
      this.point.updateMaxTime( minutosStr + ':' + segundosStr );
    }
  }

  formatTime(time: number){
    return time < 10 ? '0'+time : time.toString();
  }

  reset(){
    this.seconds = 0;
    this.minutes = 0;
  }
}
