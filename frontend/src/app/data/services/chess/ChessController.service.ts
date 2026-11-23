import { Injectable, computed, inject, signal } from '@angular/core';
import { persisted } from '@app-persistence';
import {
  ChessBotLevel,
  ChessMode,
  ChessSide,
  PlayedMove,
} from '@app/data/models/chess/chess-mode';
import { chessSettings } from '@app/data/services/chess/chess-saves';
import { CHESS_BOT_LEVELS, CHESS_SIDES } from 'assets/constants/chess';
import { ChessBoard } from '@app/data/services/chess/ChessBoard.service';
import { Piece } from '@app/data/services/chess/Piece';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { ChessHistory } from '@app/data/services/chess/ChessHistory.service';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { SafeCoords } from '@app/data/models/chess/chess-coords';
import { ChessBoardConverter } from '@app/data/services/chess/ChessBoardConverter.service';
import { ChessGameOverType } from '@app/data/models/chess/chess-gameOverType';
import { ChessMoveCounter } from '@app/data/services/chess/ChessMoveCounter.service';
import { ChessPieceMover } from '@app/data/services/chess/ChessPieceMover.service';
import { ChessCaptureCounter } from '@app/data/services/chess/ChessCaptureCounter.service';
import { ChessMoveHandler } from '@app/data/services/chess/ChessMoveHandler.service';
import { ChessGameStateManager } from '@app/data/services/chess/ChessGameStateManager.service';
import { Subject } from 'rxjs';

/** How a game against the machine is set up. */
export interface MachineSetup {
  level: ChessBotLevel;
  side: ChessSide;
}

@Injectable()
export class ChessController {
  private chessBoard = inject(ChessBoard);
  private chessHistory = inject(ChessHistory);
  private moveCounter = inject(ChessMoveCounter);
  private pieceMover = inject(ChessPieceMover);
  private moveHandler = inject(ChessMoveHandler);
  private gameStateManager = inject(ChessGameStateManager);
  public captureCounter = inject(ChessCaptureCounter);

  private _isGameOver = signal(false);
  private _playerTurn = signal(ChessPlayers.WHITE);
  private _gameOverType = signal(ChessGameOverType.IN_GAME);
  private _isPaused = signal(true);
  public restartActive = new Subject<boolean>();
  /** Every move of the game so far, in order: what undo replays. */
  private _playedMoves: PlayedMove[] = [];
  /** How many moves have been played: tells one position of the game from the next. */
  private _ply = signal(0);

  /** Counts the games started: a new number is a new game on the board. */
  private _gameNumber = signal(0);

  /** False on the opening menu, before a mode is picked. */
  private _started = signal(false);
  private _mode = signal<ChessMode>('practice');
  /** The side the player moves against the machine. */
  private _humanColor = signal(ChessPlayers.WHITE);
  /** The level and side last picked against the machine, kept between visits. */
  private readonly settings = persisted(chessSettings);

  /** How the next game against the machine is set up, unless told otherwise. */
  public readonly machineSetup = computed<MachineSetup>(() => {
    const { level, side } = this.settings.value();
    return {
      level: CHESS_BOT_LEVELS.find((known) => known.id === level)?.id ?? 'normal',
      side: CHESS_SIDES.find((known) => known.id === side)?.id ?? 'white',
    };
  });

  /** True while the machine owes a move. */
  private readonly _isBotTurn = computed(
    () =>
      this._mode() === 'machine' &&
      !this._isGameOver() &&
      this._playerTurn() !== this._humanColor()
  );

  constructor() {
    this.pieceMover.updateSafeCoords(this.chessBoard.board, {
      isInCheck: this.chessHistory.checkState.isInCheck,
      lastMove: this.chessHistory.lastMove,
      currentPlayer: this._playerTurn(),
    });
    this.chessHistory.updateHistory(this.currentChessBoardView);
  }

  /**
   * Starts a game in `mode`. Against the machine, `setup` says at which
   * level and with which side; it is remembered for the next time.
   */
  public start(mode: ChessMode, setup: MachineSetup = this.machineSetup()): void {
    if (mode === 'machine') this.settings.set({ ...setup });
    this._mode.set(mode);
    this._started.set(true);
    this.restartGame();
  }

  /** Leaves the game for the opening menu, to pick a mode again. */
  public backToMenu(): void {
    this._mode.set('practice');
    this.restartGame();
    this._started.set(false);
    this.isPaused = true;
  }

  /** A new game in the same mode. Against the machine, a random side is drawn again. */
  public restartGame(): void {
    if (this._mode() === 'machine') {
      const { side } = this.machineSetup();
      const drawn = Math.random() < 0.5 ? 'white' : 'black';
      const white = (side === 'random' ? drawn : side) === 'white';
      this._humanColor.set(white ? ChessPlayers.WHITE : ChessPlayers.BLACK);
    }
    this.resetGame();
    this._gameNumber.update((games) => games + 1);
    this.isPaused = false;
  }

  /** The starting position, with nothing played. */
  private resetGame(): void {
    this.gameOverType = ChessGameOverType.IN_GAME;
    this.isGameOver = false;
    this.playerTurn = ChessPlayers.WHITE;
    this._playedMoves = [];
    this._ply.set(0);

    this.chessBoard.restart();
    this.chessHistory.resetAllHistory();
    this.moveCounter.resetState();
    this.pieceMover.resetSafeCoords();
    this.captureCounter.resetCaptureCounter();

    this.pieceMover.updateSafeCoords(this.chessBoard.board, {
      isInCheck: this.chessHistory.checkState.isInCheck,
      lastMove: this.chessHistory.lastMove,
      currentPlayer: this._playerTurn(),
    });
    this.chessHistory.updateHistory(this.chessBoard.chessBoardView());
  }

  public movePiece(
    prevX: number,
    prevY: number,
    newX: number,
    newY: number,
    promotedPieceType: PieceSymbol | null
  ): void {
    if (this._isGameOver()) throw new Error('Game is over, you cant play move');

    const moveType = this.moveHandler.executeMove(
      prevX, prevY, newX, newY, this._playerTurn(), promotedPieceType
    );
    if (!moveType) return;

    this._playedMoves.push({ prevX, prevY, newX, newY, promotedPieceType });
    this._ply.set(this._playedMoves.length);
    this.swapPlayer();
    this.moveHandler.updateMoveHistory(prevX, prevY, newX, newY, moveType);

    const updatedSafeCoords = this.gameStateManager.evaluateCheckState(
      this._playerTurn(), moveType
    );

    const gameOverType = this.gameStateManager.updateAfterMove(
      updatedSafeCoords, promotedPieceType, this._playerTurn(), this.currentChessBoardView
    );

    if (gameOverType) {
      this.gameOverType = gameOverType;
      this.isGameOver = true;
    }
  }

  /**
   * Takes back the last move. The game is played again from the start
   * without it, so castling rights, en passant, captures, check and the
   * draw counters all come back exactly as they were.
   *
   * Against the machine it is the player's move that is taken back, and
   * with it the machine's answer if it already gave one: the turn always
   * goes back to the player.
   */
  public undoLastMove(): boolean {
    const undone = this.movesToUndo;
    if (undone === 0) return false;

    const replay = this._playedMoves.slice(0, -undone);
    this.resetGame();
    for (const move of replay) {
      this.movePiece(
        move.prevX, move.prevY, move.newX, move.newY, move.promotedPieceType
      );
    }
    this.chessHistory.moveHistoryPointerTo(this.history.length - 1);
    return true;
  }

  public get canUndo(): boolean {
    return this.movesToUndo > 0;
  }

  /** How many moves an undo takes back: 0 when there is nothing to undo. */
  private get movesToUndo(): number {
    const played = this._ply();
    if (this._mode() !== 'machine') return Math.min(played, 1);
    // White makes the moves at even places of the list, starting from 0.
    const lastWasWhite = played % 2 === 1;
    const lastWasPlayers = lastWasWhite === (this._humanColor() === ChessPlayers.WHITE);
    const undone = lastWasPlayers ? 1 : 2;
    return played >= undone ? undone : 0;
  }

  private swapPlayer(): void {
    const whiteIsPlaying = this._playerTurn() === ChessPlayers.WHITE;
    this.playerTurn = whiteIsPlaying ? ChessPlayers.BLACK : ChessPlayers.WHITE;
  }

  // --- Getters / Setters ---

  public get started(): boolean {
    return this._started();
  }

  public get mode(): ChessMode {
    return this._mode();
  }

  /** The side the player moves against the machine. */
  public get humanColor(): ChessPlayers {
    return this._humanColor();
  }

  public get botLevel(): ChessBotLevel {
    return this.machineSetup().level;
  }

  public get isBotTurn(): boolean {
    return this._isBotTurn();
  }

  /** Goes up with every game started. */
  public get gameNumber(): number {
    return this._gameNumber();
  }

  /** How many moves have been played. */
  public get ply(): number {
    return this._ply();
  }

  /** Every move of the game so far, in order. */
  public get playedMoves(): readonly PlayedMove[] {
    return this._playedMoves;
  }

  public get board(): Piece[][] {
    return this.chessBoard.board;
  }

  public get playerTurn(): ChessPlayers {
    return this._playerTurn.asReadonly()();
  }
  private set playerTurn(updated: ChessPlayers) {
    this._playerTurn.set(updated);
  }

  public get gameOverType(): ChessGameOverType {
    return this._gameOverType();
  }
  private set gameOverType(updated: ChessGameOverType) {
    this._gameOverType.set(updated);
  }

  public get isGameOver(): boolean {
    return this._isGameOver.asReadonly()();
  }
  private set isGameOver(updated: boolean) {
    this._isGameOver.set(updated);
  }

  public get isPaused(): boolean {
    return this._isPaused();
  }
  public set isPaused(updated: boolean) {
    this._isPaused.set(updated);
  }

  public get currentChessBoardView(): PieceSymbol[][] {
    return this.chessBoard.chessBoardView();
  }

  public get gameHistory(): ChessHistory {
    return this.chessHistory;
  }

  public get history() {
    return this.chessHistory.gameHistory;
  }

  public get safeCoords(): SafeCoords {
    return this.pieceMover.safeCoords;
  }
}
