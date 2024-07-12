import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChronometerUpdated } from '@app/data/models/ChronometerUpdated';
import { GameName } from '@app/data/models/GameName.enum';
import { ChronometerServiceService } from '@app/data/services/chronometerService.service';
import { PointsService } from '@app/data/services/tetris/Points.service';
import { TetrisControllerService } from '@app/data/services/tetris/TetrisController.service';
import { destroy } from '@app/data/services/util.service';
import { Observable, Subscription, interval } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'chronometer',
  templateUrl: './chronometer.component.html',
  styleUrls: ['./chronometer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChronometerComponent implements OnInit {
  private seconds = signal(0);
  private minutes = signal(0);
  public time = signal('00:00');
  protected maxSecond = signal(0);
  public maxMinute = signal(0);
  public isUpdated = signal(true);

  private destroy$ = inject(DestroyRef);
  private controller = inject(ChronometerServiceService);
  private point = inject(PointsService);

  constructor() {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroy$))
      .subscribe(() => {
        if (!this.controller.gameOver && !this.controller.isPaused) {
          this.isUpdated.set(true);
          this.seconds.update((seconds) => {
            if (seconds >= 59) {
              this.minutes.update((minutes) => minutes + 1);
              this.controller.minutes = this.minutes();
              return 0;
            }
            return seconds + 1;
          });
          this.updateTime();
        } else if (this.controller.gameOver && this.isUpdated()) {
          if (this.controller.gameType === GameName.TETRIS) {
            this.updateMaximumsTimes();
          }
          this.reset();
          this.isUpdated.set(false);
        }
      });
  }

  ngOnInit(): void {}

  private updateTime() {
    const minutosStr = this.formatTime(this.minutes());
    const segundosStr = this.formatTime(this.seconds());
    this.time.set(`${minutosStr}:${segundosStr}`);
  }

  public updateMaximumsTimes() {
    const currentTime = `${this.formatTime(this.minutes())}:${this.formatTime(
      this.seconds()
    )}`;
    this.point.updateTime(currentTime);

    if (
      this.maxMinute < this.minutes ||
      (this.maxMinute === this.minutes && this.maxSecond < this.seconds)
    ) {
      this.maxMinute = this.minutes;
      this.maxSecond = this.seconds;
      this.point.updateMaxTime(currentTime);
    }
  }

  private formatTime(time: number): string {
    return time < 10 ? '0' + time : time.toString();
  }

  public reset() {
    this.seconds.set(0);
    this.minutes.set(0);
  }
}
