import { AsyncPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
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
  imports: [AsyncPipe, NgClass],
  selector: 'chess-captured-pieces',
  template: `
    <div class="chess-board">
      @for(ROW of chessBoardView(); track "x-"+x; let x = $index){ @for(PIECE of
      ROW; track "y-"+y; let y = $index){
      <div
        class="chess-square"
        [id]="'square-' + x + '-' + y"
        [ngClass]="[
          getSquareColor(x, y),
          getPiecePlayer(PIECE),
          isSquarePromotionSquare(x, y),
          isSquareChecked(x, y),
          isSquareSelected(x, y),
          isSquareLastMove(x, y)
        ]"
        (click)="move(x, y)"
      >
        <div
          [ngClass]="{ 'safe-square': isSquareSafeForSelectedPiece(x, y) }"
        ></div>
        <div class="piece">
          @if(getPiece(PIECE); as piece){
          <ng-container *ngComponentOutlet="piece"></ng-container>
          }
        </div>
      </div>
      } } @if(isPromotionActive()){
      <div class="promotion-dialog">
        <div
          class="close-promotion-dialog"
          (click)="closePawnPromotionDialog()"
        >
          &times;
        </div>
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
      }
    </div>
  `,
  styleUrl: './chess-board.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessCapturedPieces {
  public chessBoardView = input<PieceSymbol[][]>([]);
  public lastMove = input<LastMove | undefined>();
  public checkState = input<CheckState>({ isInCheck: false });
  public pieceSafeCoords = input<Coords[]>([]);
  public isPromotionActive = input<boolean>(false);
  public player = input<ChessPlayers>(ChessPlayers.WHITE);

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
  public isSquareLastMove(x: number, y: number) {
    if (!this.lastMove) return '';
    const { prevX, prevY, currX, currY } = this.lastMove()!;
    const isLastMove =
      (x === prevX && y === prevY) || (x === currX && y === currY);

    return isLastMove ? 'piece-last-move' : '';
  }
  public isSquareChecked(x: number, y: number) {
    const isCheckedSquare =
      this.checkState().isInCheck &&
      this.checkState().x === x &&
      this.checkState().y === y;
    return isCheckedSquare ? 'king-in-check' : '';
  }

  public isSquarePromotionSquare(x: number, y: number) {
    if (!this.promotionCoords) return '';
    const isPromotion =
      this.promotionCoords.x === x && this.promotionCoords.y === y;
    return isPromotion ? 'promotion-square' : '';
  }

  public isSquareSelected(x: number, y: number) {
    if (
      !this.selectedSquare.symbol ||
      this.selectedSquare.symbol === PieceSymbol.UNKNOWN
    ) {
      return '';
    }

    const isSelected =
      this.selectedSquare.x === x && this.selectedSquare.y === y;

    return isSelected ? 'square-selected' : '';
  }

  public isSquareSafeForSelectedPiece(x: number, y: number): boolean {
    return this.pieceSafeCoords().some(
      (coords) => coords.x === x && coords.y === y
    );
  }

  public getSquareColor(row: number, column: number): string {
    return ChessBoard.isSquareWhite(row, column)
      ? 'square-white'
      : 'square-black';
  }

  public getPiecePlayer(pieceSymbol: PieceSymbol) {
    if (pieceSymbol === PieceSymbol.UNKNOWN) {
      return 'empty-piece';
    }
    return pieceSymbol === pieceSymbol.toUpperCase()
      ? 'white-piece'
      : 'black-piece';
  }

  public getPiece(symbol: PieceSymbol): Type<any> | null {
    return Piece.SYMBOL_TO_COMPONENT[symbol];
  }
}
