import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { ChessCapturedPieces } from '@app/presentation/components/chess-captured-pieces/chess-captured-pieces.component';

@Component({
  standalone: true,
  imports: [ChessCapturedPieces],
  selector: 'chess-card-player',
  template: `<div
    class="player-card"
    [class.is-active]="active()"
    [class.is-white]="player() === 1"
  >
    <img [src]="getProfile()" alt="" />
    <div class="player-info">
      <p class="player-name">{{ player() === 1 ? 'White' : 'Black' }} Player</p>
      <div class="captured-piece-container">
        <chess-captured-pieces [player]="player()"></chess-captured-pieces>
      </div>
    </div>
    <span class="turn-tag" aria-hidden="true">Turn</span>
  </div>`,
  styleUrl: './chess-card-player.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessCardPlayer {
  public player = input<ChessPlayers>(ChessPlayers.BLACK);
  /** True while it is this player's turn: the card lights up. */
  public active = input(false);

  getProfile() {
    return `../../../../assets/images/chess/${
      this.player() === 1 ? 'WHITE_PROFILE' : 'BLACK_PROFILE'
    }.webp`;
  }
}
