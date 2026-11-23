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
    <img [src]="getProfile()" [alt]="label() ? side() : ''" />
    <div class="player-info">
      <p class="player-name">{{ label() ?? side() + ' Player' }}</p>
      <div class="captured-piece-container">
        <chess-captured-pieces [player]="player()"></chess-captured-pieces>
      </div>
    </div>
    <span class="turn-tag" aria-hidden="true">{{ tag() }}</span>
  </div>`,
  styleUrl: './chess-card-player.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessCardPlayer {
  public player = input<ChessPlayers>(ChessPlayers.BLACK);
  /** True while it is this player's turn: the card lights up. */
  public active = input(false);
  /** Who moves this side ("You", "Machine"). Without it the card names the side. */
  public label = input<string>();
  /** What the card says while it is this player's turn. */
  public tag = input('Turn');

  protected side(): string {
    return this.player() === 1 ? 'White' : 'Black';
  }

  getProfile() {
    return `../../../../assets/images/chess/${
      this.player() === 1 ? 'WHITE_PROFILE' : 'BLACK_PROFILE'
    }.webp`;
  }
}
