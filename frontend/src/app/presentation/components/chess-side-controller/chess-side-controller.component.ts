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
          <div class="flex justify-around items-start">
            <chess-button (click)="reset.emit(0)" [disabled]="pointer() < 0">
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

            <chess-button
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
