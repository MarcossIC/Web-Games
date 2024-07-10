import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
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

type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'chess-button',
  template: ` <button type="button" class="chess-btn" (click)="click.emit()">
    <ng-content></ng-content>
  </button>`,
  styleUrls: ['./chess-button.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessButton {
  public type = input<ButtonType>('button');
  @Output() click = new EventEmitter();
}
