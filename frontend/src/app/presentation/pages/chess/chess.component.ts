import {
  CommonModule,
  NgClass,
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  effect,
  inject,
  untracked,
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
import { filter, tap } from 'rxjs';
import { keyActions } from '@app-input';
import { CHESS_KEYS } from '@app/data/services/chess/chess-controls';
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
import { ChessBot } from '@app/data/services/chess/ChessBot.service';
import { PlayedMove } from '@app/data/models/chess/chess-mode';
import { CHESS_BOT_LEVELS } from 'assets/constants/chess';

const ROWS_FROM_WHITE = [0, 1, 2, 3, 4, 5, 6, 7];
const ROWS_FROM_BLACK = [7, 6, 5, 4, 3, 2, 1, 0];

export type SelectedSquare = {
  symbol: PieceSymbol;
  x?: number;
  y?: number;
};
import { GameBarComponent } from '@app-components/game-bar/game-bar.component';

@Component({
  standalone: true,
  selector: 'app-chess',
  templateUrl: './chess.component.html',
  styleUrl: './chess.component.css',
  imports: [
    GameBarComponent,
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
  // The machine lives as long as the page: leaving it stops the worker.
  providers: [ChessBot],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessComponent implements OnInit {
  protected controller = inject(ChessController);
  private bot = inject(ChessBot);
  private destroy$ = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  /** The last question put to the machine: an answer to an older one is dropped. */
  private botRequest = 0;

  /** A game started from the menu or the end dialog is a new board to show. */
  private readonly watchNewGame = effect(() => {
    this.controller.gameNumber;
    untracked(() => {
      this.syncWithLiveGame();
      // Loaded now, the machine answers the first move without a wait.
      if (this.controller.mode === 'machine' && this.controller.started) this.bot.prepare();
    });
  });

  /**
   * Asks the machine for its move whenever it owes one. Anything that
   * changes the position or stops the game (a move, an undo, a pause, a
   * new game) makes the question moot, and it is asked again if needed.
   */
  private readonly watchBotTurn = effect(() => {
    const { isBotTurn, isPaused, started } = this.controller;
    this.controller.ply;
    this.controller.gameNumber;
    const request = ++this.botRequest;
    if (!isBotTurn || isPaused || !started) {
      // Whatever it was thinking about is no longer the position on the board.
      untracked(() => this.bot.cancel());
      return;
    }

    const level = this.controller.botLevel;
    const moves = untracked(() => [...this.controller.playedMoves]);
    this.bot.think(moves, level).then((move) => {
      if (request !== this.botRequest) return;
      this.playBotMove(move);
      this.cdr.markForCheck();
    });
  });
  protected selectedSquare: SelectedSquare;
  private pieceSafeCoords: Coords[];
  public isPromotionActive: boolean;
  private promotionCoords: Coords | null;
  private promotedPiece: PieceSymbol;
  public chessBoardView: PieceSymbol[][];

  constructor() {
    // An answer still on its way when the page is left is for nobody.
    this.destroy$.onDestroy(() => this.botRequest++);
    this.controller.restartActive
      .pipe(takeUntilDestroyed(this.destroy$))
      .subscribe((reason) => {
        if (this.controller.isGameOver && reason) this.restartGame();
      });
    this.chessBoardView = this.controller.currentChessBoardView;
    this.selectedSquare = { symbol: PieceSymbol.UNKNOWN };
    this.pieceSafeCoords = [];
    this.isPromotionActive = false;
    this.promotionCoords = null;
    this.promotedPiece = PieceSymbol.UNKNOWN;

    keyActions(CHESS_KEYS, { on: 'keyup' })
      .pipe(
        filter(() => !this.controller.isPaused && !this.controller.isGameOver),
        tap(({ action }) => {
          const pointer = this.controller.gameHistory.gameHistoryPointer;
          switch (action) {
            case 'next':
              if (pointer < this.livePointer)
                this.showPreviousPosition(pointer + 1);
              break;
            case 'previous':
              if (pointer > 0) this.showPreviousPosition(pointer - 1);
              break;
            case 'undo':
              this.undoMove();
              break;
            case 'pause':
              this.controller.isPaused = true;
              break;
          }
          this.cdr.markForCheck();
        })
      )
      .subscribe();
  }

  /** The route keeps its controller between visits: each one starts on the menu. */
  public ngOnInit(): void {
    this.controller.backToMenu();
    this.syncWithLiveGame();
  }

  public restartGame() {
    this.controller.restartGame();
    this.syncWithLiveGame();
  }

  /** Takes back the last move, even the one that ended the game. */
  public undoMove(): void {
    if (!this.controller.undoLastMove()) return;
    this.syncWithLiveGame();
  }

  /** Shows the position being played and forgets any half-made move. */
  private syncWithLiveGame(): void {
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
  }

  public dragMove(coords: CoordsInARow) {
    this.move(coords);
  }
  public move([x, y]: CoordsInARow): void {
    if (this.controller.isPaused) return;
    // A past position is only to look at: touching the board brings the
    // game back, and the next touch plays.
    if (this.isViewingHistory) {
      this.showPreviousPosition(this.livePointer);
      return;
    }
    if (this.controller.isBotTurn) return;
    this.selectingPiece(x, y);
    this.placingPiece(x, y);
  }

  public showPreviousPosition(moveIndex: number): void {
    const snapshot = this.controller.history[moveIndex];
    if (!snapshot) return;
    if (moveIndex !== this.livePointer) {
      this.selectedSquare = { symbol: PieceSymbol.UNKNOWN };
      this.pieceSafeCoords = [];
    }
    const { board, checkState, lastMove } = snapshot;
    this.chessBoardView = board;
    this.markLastMoveAndCheckState(lastMove, checkState);
    this.controller.gameHistory.moveHistoryPointerTo(moveIndex);
  }

  /**
   * Plays the machine's answer. It is checked against the moves the game
   * allows, and any of those is played instead if it is not one of them:
   * the game must go on even if the machine and the board ever disagreed.
   */
  private playBotMove(answer: PlayedMove | null): void {
    const move = answer && this.isAllowed(answer) ? answer : this.anyAllowedMove();
    if (!move) return;
    if (this.isViewingHistory) {
      this.controller.gameHistory.moveHistoryPointerTo(this.livePointer);
    }
    this.updateBoard(
      move.prevX, move.prevY, move.newX, move.newY, move.promotedPieceType
    );
  }

  private isAllowed({ prevX, prevY, newX, newY }: PlayedMove): boolean {
    const targets = this.safeCoords.get(prevX + ',' + prevY) ?? [];
    return targets.some((coords) => coords.x === newX && coords.y === newY);
  }

  private anyAllowedMove(): PlayedMove | null {
    for (const [from, targets] of this.safeCoords) {
      const [prevX, prevY] = from.split(',').map(Number);
      const { x: newX, y: newY } = targets[0];
      const isPawn =
        this.chessBoardLive[prevX][prevY].toLowerCase() === PieceSymbol.BLACK_PAWN;
      const promotes = isPawn && (newX === 0 || newX === 7);
      const queen = newX === 0 ? PieceSymbol.WHITE_QUEEN : PieceSymbol.BLACK_QUEEN;
      return {
        prevX, prevY, newX, newY,
        promotedPieceType: promotes ? queen : PieceSymbol.UNKNOWN,
      };
    }
    return null;
  }

  private get chessBoardLive(): PieceSymbol[][] {
    return this.controller.currentChessBoardView;
  }

  /** True when the player has black: the board is shown from that side. */
  protected get flipped(): boolean {
    return (
      this.controller.mode === 'machine' &&
      this.controller.humanColor === ChessPlayers.BLACK
    );
  }

  /** Rows and columns in the order they are drawn, top to bottom and left to right. */
  protected get drawOrder(): number[] {
    return this.flipped ? ROWS_FROM_BLACK : ROWS_FROM_WHITE;
  }

  /** The side at the top of the board: the rival's. */
  protected get topPlayer(): ChessPlayers {
    return this.flipped ? ChessPlayers.WHITE : ChessPlayers.BLACK;
  }

  protected get bottomPlayer(): ChessPlayers {
    return this.flipped ? ChessPlayers.BLACK : ChessPlayers.WHITE;
  }

  /** Who moves a side: nobody in particular in practice, the player or the machine otherwise. */
  protected playerLabel(player: ChessPlayers): string | undefined {
    if (this.controller.mode !== 'machine') return undefined;
    if (player === this.controller.humanColor) return 'You';
    const level = CHESS_BOT_LEVELS.find(({ id }) => id === this.controller.botLevel);
    return `Machine · ${level?.name}`;
  }

  /** What the lit card says: the machine is not waiting, it is thinking. */
  protected turnTag(player: ChessPlayers): string {
    const machines =
      this.controller.mode === 'machine' && player !== this.controller.humanColor;
    return machines ? 'Thinking' : 'Turn';
  }

  /** Index of the position being played in the history. */
  protected get livePointer(): number {
    return Math.max(this.controller.history.length - 1, 0);
  }

  protected get isViewingHistory(): boolean {
    return this.controller.gameHistory.gameHistoryPointer !== this.livePointer;
  }

  protected get currentPlayer() {
    return this.controller.playerTurn;
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
