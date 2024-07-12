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
    <div class="promotion-dialog">
      <div class="close-promotion-dialog" (click)="close()">&times;</div>
      @for(PIECE_SYMBOL of getPromotionPieces(); track "pp-"+$index){
      @if(getPiece(PIECE_SYMBOL); as piece){
      <div
        class="piece w-full h-[22%] piece-promotion-style cursor-pointer"
        [ngClass]="[getPiecePlayer(PIECE_SYMBOL)]"
        (click)="promotePiece(PIECE_SYMBOL)"
      >
        <ng-container *ngComponentOutlet="piece"></ng-container>
      </div>
      } }
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
