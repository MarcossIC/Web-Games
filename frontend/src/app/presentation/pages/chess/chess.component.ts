import { CommonModule, NgClass } from '@angular/common';
import { Component, OnInit, Type, inject, signal } from '@angular/core';
import { ChessBoard } from '@app/data/services/chess/ChessBoard.service';
import { Piece } from '@app/data/services/chess/Piece';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { ChessController } from '@app/data/services/chess/ChessController.service';
import { BishopPieceComponent } from '@app/presentation/components/chess-pieces/bishop.component';
import { KnightPieceComponent } from '@app/presentation/components/chess-pieces/knight.component';
import { PawnPieceComponent } from '@app/presentation/components/chess-pieces/pawn.component';
import { KingPieceComponent } from '@app/presentation/components/chess-pieces/king.component';
import { RookPieceComponent } from '@app/presentation/components/chess-pieces/rook.component';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { ChessGameOverType } from '@app/data/models/chess/chess-gameOverType';
import { Coords } from '@app/data/models/chess/chess-coords';
import { BehaviorSubject } from 'rxjs';
import { ChessBoardConverter } from '@app/data/services/chess/ChessBoardConverter.service';
import { QueenPieceComponent } from '@app/presentation/components/chess-pieces/queen.component';

export type SelectedSquare = {
  symbol: PieceSymbol;
  x?: number;
  y?: number;
};

@Component({
  standalone: true,
  selector: 'app-chess',
  templateUrl: './chess.component.html',
  styleUrl: './chess.component.css',
  imports: [
    CommonModule,
    NgClass,
    QueenPieceComponent,
    PawnPieceComponent,
    RookPieceComponent,
    KnightPieceComponent,
    BishopPieceComponent,
    KingPieceComponent,
  ],
})
export class ChessComponent implements OnInit {
  protected controller = inject(ChessController);
  protected selectedSquare: SelectedSquare = { symbol: PieceSymbol.UNKNOWN };
  private pieceSafeCoords: Coords[] = [];
  public isPromotionActive: boolean = false;
  private promotionCoords: Coords | null = null;
  private promotedPiece: PieceSymbol = PieceSymbol.UNKNOWN;
  public boardView = signal(this.chessBoardView);
  public gameHistoryPointer: number = 0;
  public chessBoardState$ = new BehaviorSubject<string>(
    ChessBoardConverter.DEFAULT_INITIAL_POSITION
  );

  ngOnInit(): void {
    this.controller.restartGame();
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

  public isSquareLastMove(x: number, y: number) {
    if (!this.lastMove) return '';
    const { prevX, prevY, currX, currY } = this.lastMove;
    const isLastMove =
      (x === prevX && y === prevY) || (x === currX && y === currY);

    return isLastMove ? 'piece-last-move' : '';
  }
  public isSquareChecked(x: number, y: number) {
    const isCheckedSquare =
      this.checkState.isInCheck &&
      this.checkState.x === x &&
      this.checkState.y === y;
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
    return this.pieceSafeCoords.some(
      (coords) => coords.x === x && coords.y === y
    );
  }

  private selectingPiece(x: number, y: number): void {
    if (this.gameOverType !== ChessGameOverType.IN_GAME) return;

    const pieceSymbol: PieceSymbol = this.chessBoardView[x][y];

    if (pieceSymbol === PieceSymbol.UNKNOWN) return;
    if (this.isWrongPieceSelected(pieceSymbol)) return;

    const isSameSquareClicked =
      this.selectedSquare.symbol !== PieceSymbol.UNKNOWN &&
      this.selectedSquare.x === x &&
      this.selectedSquare.y === y;

    this.unmarkingPreviouslySlectedAndSafeSquares();
    if (isSameSquareClicked) return;

    this.selectedSquare = { symbol: pieceSymbol, x, y };
    this.pieceSafeCoords = this.safeCoords.get(x + ',' + y) || [];
  }

  private placingPiece(newX: number, newY: number): void {
    if (this.selectedSquare.symbol === PieceSymbol.UNKNOWN) return;
    if (!this.isSquareSafeForSelectedPiece(newX, newY)) return;

    // pawn promotion
    const isPawnSelected: boolean =
      this.selectedSquare.symbol === PieceSymbol.WHITE_PAWN ||
      this.selectedSquare.symbol === PieceSymbol.BLACK_PAWN;

    const isPawnOnlastRank: boolean =
      isPawnSelected && (newX === 7 || newX === 0);

    const shouldOpenPromotionDialog: boolean =
      !this.isPromotionActive && isPawnOnlastRank;

    if (shouldOpenPromotionDialog) {
      this.pieceSafeCoords = [];
      this.isPromotionActive = true;
      this.promotionCoords = { x: newX, y: newY };
      // because now we wait for player to choose promoted piece
      return;
    }

    const { x: prevX, y: prevY } = this.selectedSquare;
    this.updateBoard(prevX!, prevY!, newX, newY, this.promotedPiece);
  }

  public promotionPieces(): PieceSymbol[] {
    return this.currentPlayer === ChessPlayers.WHITE
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

  public promotePiece(piece: PieceSymbol): void {
    if (
      !this.promotionCoords ||
      !this.selectedSquare.symbol ||
      this.selectedSquare.symbol === PieceSymbol.UNKNOWN
    ) {
      return;
    }

    this.promotedPiece = piece;
    const { x: newX, y: newY } = this.promotionCoords;
    const { x: prevX, y: prevY } = this.selectedSquare;
    this.updateBoard(prevX!, prevY!, newX, newY, this.promotedPiece);
  }

  public closePawnPromotionDialog(): void {
    this.unmarkingPreviouslySlectedAndSafeSquares();
  }

  private isWrongPieceSelected(piece: PieceSymbol): boolean {
    const isWhitePieceSelected = piece === piece.toUpperCase();
    return (
      (isWhitePieceSelected && this.currentPlayer === ChessPlayers.BLACK) ||
      (!isWhitePieceSelected && this.currentPlayer === ChessPlayers.WHITE)
    );
  }

  private unmarkingPreviouslySlectedAndSafeSquares(): void {
    this.selectedSquare = { symbol: PieceSymbol.UNKNOWN };
    this.pieceSafeCoords = [];

    if (this.isPromotionActive) {
      this.isPromotionActive = false;
      this.promotedPiece = PieceSymbol.UNKNOWN;
      this.promotionCoords = null;
    }
  }

  protected updateBoard(
    prevX: number,
    prevY: number,
    newX: number,
    newY: number,
    promotedPiece: PieceSymbol | null
  ): void {
    this.controller.movePiece(prevX, prevY, newX, newY, promotedPiece);
    this.boardView.set(this.chessBoardView);
    this.markLastMoveAndCheckState();
    this.unmarkingPreviouslySlectedAndSafeSquares();

    this.chessBoardState$.next(this.controller.boardAsSymbols);

    this.gameHistoryPointer++;
  }

  private markLastMoveAndCheckState(): void {
    if (this.lastMove) {
      //this.moveSound(this.lastMove.moveType);
    } else {
      //this.moveSound(new Set<MoveType>([MoveType.BasicMove]));
    }
  }

  public move(x: number, y: number): void {
    this.selectingPiece(x, y);
    this.placingPiece(x, y);
  }

  protected get currentPlayer() {
    return this.controller.playerGo;
  }
  protected get gameOverType() {
    return this.controller.gameOverType;
  }
  protected get chessBoardView() {
    return this.controller.currentChessBoardView;
  }
  protected get safeCoords() {
    return this.controller.safeCoords;
  }
  protected get lastMove() {
    return this.controller.gameHistory.lastMove;
  }
  protected get checkState() {
    return this.controller.gameHistory.checkState;
  }
}

export default ChessComponent;
