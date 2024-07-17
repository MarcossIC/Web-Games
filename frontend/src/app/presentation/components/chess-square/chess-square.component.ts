import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  input,
  Output,
  Type,
} from '@angular/core';
import { CoordsInARow } from '@app/data/models/chess/chess-coords';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { ChessBoard } from '@app/data/services/chess/ChessBoard.service';
import { Piece } from '@app/data/services/chess/Piece';

function verifyPromotion(is: boolean): string {
  return is ? 'promotion-square' : '';
}
function verifyCheckState(is: boolean): string {
  return is ? 'king-in-check' : '';
}
function verifySelected(is: boolean): string {
  return is ? 'square-selected' : '';
}
function verifyLastmove(is: boolean): string {
  return is ? 'piece-last-move' : '';
}

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'chess-square',
  template: `
    <div
      class="chess-square"
      [id]="'square-' + row() + '-' + column()"
      [ngClass]="[
        getSquareColor(),
        getPiecePlayer(),
        isSquarePromotionSquare(),
        isSquareChecked(),
        isSquareSelected(),
        isSquareLastMove()
      ]"
      [draggable]="isDraggable()"
      (click)="move()"
      (dragstart)="moveDragPiece()"
      (dragover)="moveDragOver($event)"
      (drop)="moveDragPiece()"
    >
      <div [ngClass]="{ 'safe-square': isSquareSafeForSelectedPiece() }"></div>
      <div class="piece">
        @if(getPiece(); as piece){
        <ng-container *ngComponentOutlet="piece"></ng-container>
        }
      </div>
    </div>
  `,
  styleUrls: [
    './chess-square.component.css',
    '../../../shared/styles/chess-pieces.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessSquare {
  public row = input.required<number>();
  public column = input.required<number>();
  public piece = input.required<PieceSymbol>();
  public player = input.required<ChessPlayers>();
  public isSquarePromotionSquare = input.required({
    transform: verifyPromotion,
  });
  public isSquareChecked = input.required({
    transform: verifyCheckState,
  });
  public isSquareSelected = input.required({
    transform: verifySelected,
  });
  public isSquareLastMove = input.required({
    transform: verifyLastmove,
  });
  public isSquareSafeForSelectedPiece = input.required<boolean>();

  @Output() clickSquare = new EventEmitter<CoordsInARow>();
  @Output() dragPiece = new EventEmitter<CoordsInARow>();

  public getSquareColor(): string {
    return ChessBoard.isSquareWhite(this.row(), this.column())
      ? 'square-white'
      : 'square-black';
  }

  public getPiecePlayer() {
    return Piece.getPiecePlayer(this.piece());
  }

  public isDraggable() {
    const currentPieceIsWhite = this.piece().toUpperCase() === this.piece();
    const isCurrentPlayerWhite = this.player() === ChessPlayers.WHITE;

    const playerPiece = isCurrentPlayerWhite
      ? currentPieceIsWhite
      : !currentPieceIsWhite;
    return this.piece() !== PieceSymbol.UNKNOWN && playerPiece;
  }

  public getPiece(): Type<any> | null {
    return Piece.SYMBOL_TO_COMPONENT[this.piece()];
  }

  public move() {
    this.clickSquare.emit([this.row(), this.column()]);
  }
  public moveDragOver(e: DragEvent) {
    e.preventDefault();
  }

  public moveDragPiece() {
    this.dragPiece.emit([this.row(), this.column()]);
  }
}
