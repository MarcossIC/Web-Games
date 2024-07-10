import { AsyncPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  Type,
} from '@angular/core';
import {
  CaptureCounter,
  PieceCaptureCounter,
} from '@app/data/models/chess/chess-capturedpieces';
import { CheckState } from '@app/data/models/chess/chess-checkstate';
import { Coords } from '@app/data/models/chess/chess-coords';
import { LastMove } from '@app/data/models/chess/chess-lastmove';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { ChessBoard } from '@app/data/services/chess/ChessBoard.service';
import { ChessCaptureCounter } from '@app/data/services/chess/ChessCaptureCounter.service';
import { Piece } from '@app/data/services/chess/Piece';
import { Observable } from 'rxjs';

@Component({
  standalone: true,
  imports: [NgClass],
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
