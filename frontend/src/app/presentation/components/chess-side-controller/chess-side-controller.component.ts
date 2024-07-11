import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  input,
  Output,
  Type,
} from '@angular/core';
import { CheckState } from '@app/data/models/chess/chess-checkstate';
import { Coords, CoordsInARow } from '@app/data/models/chess/chess-coords';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { ChessBoard } from '@app/data/services/chess/ChessBoard.service';
import { Piece } from '@app/data/services/chess/Piece';
import { ChessButton } from '@app/presentation/components/chess-button/chess-button.component';

@Component({
  standalone: true,
  imports: [CommonModule, ChessButton],
  selector: 'chess-side-controller',
  template: ` <div class="chess-side-board">
    <div class="chess-side-board-container">
      <div class="player-controller-moves">
        <div class="controller-title"><p>Game moves</p></div>
        <div class="move-controller-container">
          <div class="flex justify-around items-start">
            <chess-button (click)="reset.emit()">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </chess-button>

            <chess-button (click)="goBack.emit()">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.75 19.5 8.25 12l7.5-7.5"
                />
              </svg>
            </chess-button>

            <chess-button (click)="forward.emit()">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
            </chess-button>
          </div>
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  </div>`,
  styleUrls: ['./chess-side-controller.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessSideController {
  @Output() reset = new EventEmitter();
  @Output() forward = new EventEmitter();
  @Output() goBack = new EventEmitter();
}
