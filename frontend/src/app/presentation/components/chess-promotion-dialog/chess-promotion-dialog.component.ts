import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  input,
  Output,
  Type,
} from '@angular/core';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { Piece } from '@app/data/services/chess/Piece';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'chess-promotion-dialog',
  template: `
    <div class="promotion-dialog" role="dialog" aria-label="Promote the pawn">
      <p class="promotion-title">Promote</p>
      <div class="promotion-pieces">
        @for(PIECE_SYMBOL of getPromotionPieces(); track "pp-"+$index){
        @if(getPiece(PIECE_SYMBOL); as piece){
        <button
          type="button"
          class="piece piece-promotion-style promotion-piece"
          [ngClass]="[getPiecePlayer(PIECE_SYMBOL)]"
          (click)="promotePiece(PIECE_SYMBOL)"
        >
          <ng-container *ngComponentOutlet="piece"></ng-container>
        </button>
        } }
      </div>
      <button
        type="button"
        class="close-promotion-dialog"
        aria-label="Cancel"
        (click)="close()"
      >
        &times;
      </button>
    </div>
  `,
  styleUrls: [
    './chess-promotion-dialog.component.css',
    '../../../shared/styles/chess-pieces.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessPromotionDialog {
  public player = input.required<ChessPlayers>();

  @Output() promote = new EventEmitter<PieceSymbol>();
  @Output() closeDialog = new EventEmitter<boolean>();

  public getPromotionPieces(): PieceSymbol[] {
    return this.player() === ChessPlayers.WHITE
      ? [
          PieceSymbol.WHITE_KNIGHT,
          PieceSymbol.WHITE_BISHOP,
          PieceSymbol.WHITE_ROOK,
          PieceSymbol.WHITE_QUEEN,
        ]
      : [
          PieceSymbol.BLACK_KNIGHT,
          PieceSymbol.BLACK_BISHOP,
          PieceSymbol.BLACK_ROOK,
          PieceSymbol.BLACK_QUEEN,
        ];
  }

  public getPiece(piece: PieceSymbol): Type<any> | null {
    return Piece.SYMBOL_TO_COMPONENT[piece];
  }

  public getPiecePlayer(piece: PieceSymbol) {
    return Piece.getPiecePlayer(piece);
  }

  public promotePiece(piece: PieceSymbol) {
    this.promote.emit(piece);
  }
  public close() {
    this.closeDialog.emit(true);
  }
}
