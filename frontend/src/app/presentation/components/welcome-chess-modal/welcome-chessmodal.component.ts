import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { ChessController } from '@app/data/services/chess/ChessController.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'welcome-chess-modal',
  templateUrl: './welcome-chessmodal.component.html',
  styleUrls: [
    '../../../shared/styles/modal.css',
    './welcome-chessmodal.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeChessModal {
  protected controller = inject(ChessController);
  private router = inject(Router);
  private playButton = viewChild.required<ElementRef<HTMLButtonElement>>('play');

  /** True when the dialog is a pause in a game that is already going. */
  readonly resuming = input(false);

  constructor() {
    // Enter starts or resumes the game without reaching for the mouse.
    afterNextRender(() => this.playButton().nativeElement.focus());
  }

  protected close(): void {
    this.controller.restartGame();
    this.controller.isPaused = true;
    this.router.navigate(['/games']);
  }

  protected playGame(): void {
    this.controller.isPaused = false;
  }
}
