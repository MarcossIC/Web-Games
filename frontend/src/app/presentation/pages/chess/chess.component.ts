import {
  CommonModule,
  DOCUMENT,
  NgClass,
  isPlatformBrowser,
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { ChessController } from '@app/data/services/chess/ChessController.service';
import { BishopPieceComponent } from '@app/presentation/components/chess-pieces/bishop.component';
import { KnightPieceComponent } from '@app/presentation/components/chess-pieces/knight.component';
import { PawnPieceComponent } from '@app/presentation/components/chess-pieces/pawn.component';
import { KingPieceComponent } from '@app/presentation/components/chess-pieces/king.component';
import { RookPieceComponent } from '@app/presentation/components/chess-pieces/rook.component';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { ChessGameOverType } from '@app/data/models/chess/chess-gameOverType';
import { Coords, CoordsInARow } from '@app/data/models/chess/chess-coords';
import { filter, fromEvent, tap } from 'rxjs';
import { QueenPieceComponent } from '@app/presentation/components/chess-pieces/queen.component';
import { ChessCardPlayer } from '@app/presentation/components/chess-card-player/chess-card-player.component';
import { LastMove } from '@app/data/models/chess/chess-lastmove';
import { CheckState } from '@app/data/models/chess/chess-checkstate';
import { ChessMoveListComponent } from '@app/presentation/components/chess-move-list/chess-move-list.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChessGameBoard } from '@app/presentation/components/chess-board/chess-board.component';
import { ChessSquare } from '@app/presentation/components/chess-square/chess-square.component';
import { ChessPromotionDialog } from '@app/presentation/components/chess-promotion-dialog/chess-promotion-dialog.component';
import { ChessSideController } from '@app/presentation/components/chess-side-controller/chess-side-controller.component';
import { WelcomeChessModal } from '@app/presentation/components/welcome-chess-modal/welcome-chessmodal.component';
import { EndGameModalChess } from '@app/presentation/components/endgame-modal-chess/endgame-modal-chess.component';

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
    ChessCardPlayer,
    ChessMoveListComponent,
    ChessGameBoard,
    ChessSquare,
    ChessPromotionDialog,
    ChessSideController,
    WelcomeChessModal,
    EndGameModalChess,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessComponent implements OnInit {
  protected controller = inject(ChessController);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private detroy$ = inject(DestroyRef);
  protected selectedSquare: SelectedSquare;
  private pieceSafeCoords: Coords[];
  public isPromotionActive: boolean;
  private promotionCoords: Coords | null;
  private promotedPiece: PieceSymbol;
  public chessBoardView: PieceSymbol[][];

  constructor() {
    this.chessBoardView = this.controller.currentChessBoardView;
    this.selectedSquare = { symbol: PieceSymbol.UNKNOWN };
    this.pieceSafeCoords = [];
    this.isPromotionActive = false;
    this.promotionCoords = null;
    this.promotedPiece = PieceSymbol.UNKNOWN;

    if (isPlatformBrowser(this.platformId)) {
      fromEvent<KeyboardEvent>(this.document, 'keyup')
        .pipe(
          filter(
            (event) =>
              event.key === 'ArrowRight' ||
              event.key === 'ArrowLeft' ||
              event.key === 'p' ||
              event.key === 'Escape'
          ),
          tap(({ key }) => {
            const pointer = this.controller.gameHistory.gameHistoryPointer;
            const historySize =
              this.controller.gameHistory.gameHistory.length - 1;
            switch (key) {
              case 'ArrowRight':
                if (pointer === historySize) return;
                this.controller.gameHistory.advanceHistoryPointer();
                break;
              case 'ArrowLeft':
                if (pointer === 0) return;
                this.controller.gameHistory.goBackHistoryPointer();
                break;
              case 'p':
              case 'Escape':
                if (this.controller.isPaused) return;
                this.controller.isPaused = true;
                break;
              default:
                break;
            }

            this.showPreviousPosition(pointer);
          }),
          takeUntilDestroyed(this.detroy$)
        )
        .subscribe();
    }
  }

  public ngOnInit(): void {
    this.restartGame();
  }

  public restartGame() {
    this.controller.restartGame();
    this.chessBoardView = this.controller.currentChessBoardView;
    this.selectedSquare = { symbol: PieceSymbol.UNKNOWN };
    this.pieceSafeCoords = [];
    this.isPromotionActive = false;
    this.promotionCoords = null;
    this.promotedPiece = PieceSymbol.UNKNOWN;
  }

  public isSquareLastMove(x: number, y: number) {
    if (!this.lastMove) return false;
    const { prevX, prevY, currX, currY } = this.lastMove;

    return (x === prevX && y === prevY) || (x === currX && y === currY);
  }
  public isSquareChecked(x: number, y: number) {
    return (
      this.checkState.isInCheck &&
      this.checkState.x === x &&
      this.checkState.y === y
    );
  }

  public isSquarePromotionSquare(x: number, y: number) {
    if (!this.promotionCoords) return false;
    return this.promotionCoords.x === x && this.promotionCoords.y === y;
  }

  public isSquareSelected(x: number, y: number) {
    if (
      !this.selectedSquare.symbol ||
      this.selectedSquare.symbol === PieceSymbol.UNKNOWN
    )
      return false;

    return this.selectedSquare.x === x && this.selectedSquare.y === y;
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
    const realPointer = this.realHistoryPointer;
    if (realPointer !== this.controller.gameHistory.gameHistoryPointer) {
      this.controller.gameHistory.moveHistoryPointerTo(realPointer);
    }

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
    this.chessBoardView = this.controller.currentChessBoardView;
    this.markLastMoveAndCheckState(this.lastMove, this.checkState);
    this.unmarkingPreviouslySlectedAndSafeSquares();

    this.controller.gameHistory.advanceHistoryPointer();
  }

  private markLastMoveAndCheckState(
    lastMove: LastMove | undefined,
    checkState: CheckState
  ): void {
    this.controller.gameHistory.setLastMove(lastMove);
    this.controller.gameHistory.setCheckState(checkState);
    if (this.lastMove) {
      //this.moveSound(this.lastMove.moveType);
    } else {
      //this.moveSound(new Set<MoveType>([MoveType.BasicMove]));
    }
  }

  public move([x, y]: CoordsInARow): void {
    if (!this.controller.isPaused) {
      this.selectingPiece(x, y);
      this.placingPiece(x, y);
    }
  }

  public showPreviousPosition(moveIndex: number): void {
    const { board, checkState, lastMove } = this.controller.history[moveIndex];
    this.chessBoardView = board;
    this.markLastMoveAndCheckState(lastMove, checkState);
    this.controller.gameHistory.moveHistoryPointerTo(moveIndex);
  }

  private get realHistoryPointer() {
    const list = this.controller.gameHistory.moveList;
    const listSize = list.length;
    if (listSize === 1 || listSize === 0) {
      return listSize === 0 ? 0 : list[0]?.length;
    }
    return this.currentPlayer === ChessPlayers.BLACK
      ? listSize * 2 - 1
      : listSize * 2;
  }

  protected get currentPlayer() {
    return this.controller.playerGo;
  }
  protected get gameOverType() {
    return this.controller.gameOverType;
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
