import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { ChessButton } from '@app/presentation/components/chess-button/chess-button.component';

/**
 * The moves panel: the list of moves (projected) and the buttons to walk
 * through it, take a move back or start over.
 */
@Component({
  standalone: true,
  imports: [CommonModule, ChessButton],
  selector: 'chess-side-controller',
  template: ` <div class="chess-side-board">
    <div class="chess-side-board-container">
      <div class="player-controller-moves">
        <div class="controller-title"><p>Game moves</p></div>
        <div class="move-controller-container">
          <div class="move-buttons">
            <chess-button
              label="New game"
              (click)="reset.emit()"
              [disabled]="!canUndo()"
            >
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </chess-button>

            <chess-button
              class="undo"
              label="Undo move"
              (click)="canUndo() && undo.emit()"
              [disabled]="!canUndo()"
            >
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                />
              </svg>
              <span class="undo-text">Undo</span>
            </chess-button>

            <chess-button
              label="Previous move"
              (click)="pointer() > 0 && navigate.emit(pointer() - 1)"
              [disabled]="pointer() <= 0"
            >
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

            <chess-button
              label="Next move"
              (click)="pointer() < lastPointer() && navigate.emit(pointer() + 1)"
              [disabled]="pointer() >= lastPointer()"
            >
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

            <chess-button
              label="Back to the game"
              (click)="pointer() < lastPointer() && navigate.emit(lastPointer())"
              [disabled]="pointer() >= lastPointer()"
            >
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5"
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
  /** Position shown on the board, as an index in the history. */
  public pointer = input.required<number>();
  /** Index of the position being played: the end of the history. */
  public lastPointer = input.required<number>();
  public canUndo = input(false);
  readonly reset = output<void>();
  readonly undo = output<void>();
  /** Asks to show the position at this index of the history. */
  readonly navigate = output<number>();
}
