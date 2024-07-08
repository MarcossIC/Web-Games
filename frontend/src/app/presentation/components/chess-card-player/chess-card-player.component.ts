import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { ChessCapturedPieces } from '@app/presentation/components/chess-captured-pieces/chess-captured-pieces.component';

@Component({
  standalone: true,
  imports: [ChessCapturedPieces],
  selector: 'chess-card-player',
  template: `<div class="player-card">
    <img [src]="getProfile()" />
    <div>
      <p>{{ player() === 1 ? 'White' : 'Black' }} Player</p>
      <div class="captured-piece-container">
        <chess-captured-pieces [player]="player()"></chess-captured-pieces>
      </div>
    </div>
  </div>`,
  styleUrl: './chess-card-player.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessCardPlayer {
  public player = input<ChessPlayers>(ChessPlayers.BLACK);

  getProfile() {
    return `../../../../assets/images/chess/${
      this.player() === 1 ? 'WHITE_PROFILE' : 'BLACK_PROFILE'
    }.webp`;
  }
}
