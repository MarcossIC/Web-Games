import { Injectable, inject, signal } from '@angular/core';
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

  constructor() {
    this.pieceMover.updateSafeCoords(this.chessBoard.board, {
      isInCheck: this.chessHistory.checkState.isInCheck,
      lastMove: this.chessHistory.lastMove,
      currentPlayer: this._playerTurn(),
    });
    this.chessHistory.updateHistory(this.currentChessBoardView);
  }

  public restartGame(): void {
    this.gameOverType = ChessGameOverType.IN_GAME;
    this.isGameOver = false;
    this.playerTurn = ChessPlayers.WHITE;

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
    this.isPaused = false;
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

  private swapPlayer(): void {
    const whiteIsPlaying = this._playerTurn() === ChessPlayers.WHITE;
    this.playerTurn = whiteIsPlaying ? ChessPlayers.BLACK : ChessPlayers.WHITE;
  }

  // --- Getters / Setters ---

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
