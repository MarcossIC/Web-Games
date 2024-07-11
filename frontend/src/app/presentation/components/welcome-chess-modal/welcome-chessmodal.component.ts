import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ChessController } from '@app/data/services/chess/ChessController.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'welcome-chess-modal',
  templateUrl: './welcome-chessmodal.component.html',
  styleUrls: [
    './welcome-chessmodal.component.css',
    '../../../shared/styles/modal.css',
  ],
})
export class WelcomeChessModal {
  protected controller = inject(ChessController);
  private router = inject(Router);

  protected close(): void {
    this.controller.restartGame();
    this.controller.isPaused = true;
    this.router.navigate(['/games']);
  }

  protected playGame(): void {
    this.controller.isPaused = false;
  }
}
