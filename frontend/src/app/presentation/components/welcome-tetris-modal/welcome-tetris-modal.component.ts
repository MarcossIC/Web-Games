import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { PointsService } from '@app/data/services/tetris/Points.service';
import { TetrisControllerService } from '@app/data/services/tetris/TetrisController.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'welcome-tetris-modal',
  templateUrl: './welcome-tetris-modal.component.html',
  styleUrls: [
    '../../../shared/styles/modal.css',
    './welcome-tetris-modal.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeTetrisModalComponent {
  protected controller: TetrisControllerService = inject(
    TetrisControllerService
  );
  private point: PointsService = inject(PointsService);
  private router: Router = inject(Router);
  private playButton = viewChild.required<ElementRef<HTMLButtonElement>>('play');

  constructor() {
    // The dialog opens with the main action focused, so Enter starts or
    // resumes the game without reaching for the mouse.
    afterNextRender(() => this.playButton().nativeElement.focus());
  }

  close() {
    this.point.resetScore();
    this.point.resetLevel();
    this.controller.reset();

    this.router.navigate(['/games']);
  }

  playGame(): void {
    this.controller.resume();
  }
}
