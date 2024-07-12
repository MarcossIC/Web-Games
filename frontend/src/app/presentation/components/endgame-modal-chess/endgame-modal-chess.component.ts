import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ChessGameOverType } from '@app/data/models/chess/chess-gameOverType';
import { ChessController } from '@app/data/services/chess/ChessController.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'endgame-modal-chess',
  templateUrl: './endgame-modal-chess.component.html',
  styleUrls: [
    './endgame-modal-chess.component.css',
    '../../../shared/styles/modal.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EndGameModalChess {
  protected controller = inject(ChessController);
  private router = inject(Router);
  private readonly GAME_OVER_MESSAGE = {
    [ChessGameOverType.DRAW_BY_REPETITION]:
      'The game has ended in a tie due to repetition of moves',
    [ChessGameOverType.DRAW_BY_DROWNED]:
      'The game has ended in a tie due to drowning, pieces cannot be moved but it is not checkmate either.',
    [ChessGameOverType.DRAW_BY_FIFTYMOVES_RULE]:
      'The game has ended by the 50-move rule without seeing a winner',
    [ChessGameOverType.DRAW_BY_INSUFFICIENT_MATERIAL]:
      'The game is over, there is not enough material for there to be a winner.',
    [ChessGameOverType.CHECK_MATE_BLACK]: 'White wins!',
    [ChessGameOverType.CHECK_MATE_WHITE]: 'Black wins!',
  };

  protected close(): void {
    this.controller.restartGame();
    this.controller.isPaused = true;
    this.router.navigate(['/games']);
  }

  protected playAgain(): void {
    this.controller.restartGame();
    this.controller.isPaused = false;
  }

  public isWinner() {
    const type = this.controller.gameOverType;
    return (
      type === ChessGameOverType.CHECK_MATE_WHITE ||
      type == ChessGameOverType.CHECK_MATE_BLACK
    );
  }
  public isDraw() {
    const type = this.controller.gameOverType;
    return (
      type === ChessGameOverType.DRAW_BY_DROWNED ||
      type === ChessGameOverType.DRAW_BY_REPETITION ||
      type === ChessGameOverType.DRAW_BY_FIFTYMOVES_RULE ||
      type === ChessGameOverType.DRAW_BY_INSUFFICIENT_MATERIAL
    );
  }

  public getGameOverTypeMessage() {
    const type = this.controller.gameOverType;
    return (
      this.GAME_OVER_MESSAGE[type as keyof typeof this.GAME_OVER_MESSAGE] || ''
    );
  }
}
