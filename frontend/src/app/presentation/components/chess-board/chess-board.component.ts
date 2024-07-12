import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'chess-game-board',
  template: `
    <div class="chess-game-container">
      <ng-content select="[black]"></ng-content>
      <div class="chess-board">
        <ng-content></ng-content>
      </div>
      <ng-content select="[white]"></ng-content>
    </div>
  `,
  styleUrl: './chess-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessGameBoard {}
