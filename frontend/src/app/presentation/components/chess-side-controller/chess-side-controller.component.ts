import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  EventEmitter,
  input,
  model,
  Output,
  Signal,
} from '@angular/core';
import { createWatch, SIGNAL } from '@angular/core/primitives/signals';
import { MoveList } from '@app/data/models/chess/chess-history-move';
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
          <div class="move-buttons">
            <chess-button
              label="New game"
              (click)="reset.emit(0)"
              [disabled]="pointer() < 0"
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
              label="Previous move"
              (click)="goBack.emit(pointer() - 1)"
              [disabled]="pointer() === 0"
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
              (click)="forward.emit(pointer() + 1)"
              [disabled]="pointerIsInLast()"
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
  public pointer = input.required<number>();
  public fullMoveSize = input.required<number>();
  public moveList = input<MoveList>([]);
  @Output() reset = new EventEmitter<number>();
  @Output() forward = new EventEmitter<number>();
  @Output() goBack = new EventEmitter<number>();

  constructor() {}

  public pointerIsInLast() {
    const last = this.moveList()[this.fullMoveSize() - 1]?.length;
    if (this.pointer() === 0 && !last) return true;

    if (last === 2) {
      return this.pointer() === this.fullMoveSize() * 2;
    }

    return this.pointer() === this.fullMoveSize() * 2 - 1;
  }
}
