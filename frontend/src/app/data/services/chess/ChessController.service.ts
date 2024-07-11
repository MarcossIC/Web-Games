import { Injectable, inject, signal } from '@angular/core';
import { ChessBoard } from '@app/data/services/chess/ChessBoard.service';
import { Piece } from '@app/data/services/chess/Piece';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { ChessHistory } from '@app/data/services/chess/ChessHistory.service';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { SafeCoords } from '@app/data/models/chess/chess-coords';
import PawnPiece from '@app/data/services/chess/PawnPiece';
import KingPiece from '@app/data/services/chess/KingPiece';
import RookPiece from '@app/data/services/chess/RookPiece';
import { MoveType } from '@app/data/models/chess/chess-lastmove';
import { ChessBoardConverter } from '@app/data/services/chess/ChessBoardConverter.service';
import { ChessGameOverType } from '@app/data/models/chess/chess-gameOverType';
import { ChessMoveCounter } from '@app/data/services/chess/ChessMoveCounter.service';
import { ChessPieceMover } from '@app/data/services/chess/ChessPieceMover.service';
import { ChessCaptureCounter } from '@app/data/services/chess/ChessCaptureCounter.service';

@Injectable()
export class ChessController {
  private chessBoard = inject(ChessBoard);
  private chessHistory = inject(ChessHistory);
  private converter = inject(ChessBoardConverter);
  private moveCounter = inject(ChessMoveCounter);
  private pieceMover = inject(ChessPieceMover);
  public captureCounter = inject(ChessCaptureCounter);
  private _isGameOver: boolean;
  private _playerTurn: ChessPlayers;
  private _boardAsSymbols: string;
  private _gameOverType: ChessGameOverType;
  private _isPaused = signal(true);

  constructor() {
    this._isGameOver = false;
    this._playerTurn = ChessPlayers.WHITE;
    this.pieceMover.updateSafeCoords(this.chessBoard.board, {
      isInCheck: this.chessHistory.checkState.isInCheck,
      lastMove: this.chessHistory.lastMove,
      currentPlayer: this._playerTurn,
    });
    this.chessHistory.updateHistory(this.currentChessBoardView);
    this._boardAsSymbols = ChessBoardConverter.DEFAULT_INITIAL_POSITION;
    this._gameOverType = ChessGameOverType.IN_GAME;
  }

  public restartGame() {
    this._gameOverType = ChessGameOverType.IN_GAME;
    this._isGameOver = false;
    this._playerTurn = ChessPlayers.WHITE;
    this._boardAsSymbols = ChessBoardConverter.DEFAULT_INITIAL_POSITION;

    this.chessBoard.restart();
    this.chessHistory.resetAllHistory();
    this.moveCounter.resetState();
    this.pieceMover.resetSafeCoords();
    this.captureCounter.resetCaptureCounter();

    this.pieceMover.updateSafeCoords(this.chessBoard.board, {
      isInCheck: this.chessHistory.checkState.isInCheck,
      lastMove: this.chessHistory.lastMove,
      currentPlayer: this._playerTurn,
    });
    this.chessHistory.updateHistory(this.chessBoard.chessBoardView());
  }

  public movePiece(
    prevX: number,
    prevY: number,
    newX: number,
    newY: number,
    promotedPieceType: PieceSymbol | null
  ) {
    if (this._isGameOver) throw new Error('Game is over, you cant play move');

    if (!this.pieceMover.isValidMove(prevX, prevY, newX, newY)) {
      return;
    }

    const piece: Piece = this.chessBoard.board[prevX][prevY];
    if (!piece.isPieceMovable(this._playerTurn)) return;

    const newPositionPiece: Piece = this.chessBoard.board[newX][newY];
    this.pieceMover.checkSafeCoords(prevX, prevY, newX, newY);

    const moveType = this.getMoveType(newX, newY);
    this.captureCounter.updateCounter(
      moveType,
      this._playerTurn,
      promotedPieceType || PieceSymbol.UNKNOWN,
      newPositionPiece.symbol
    );
    this.moveCounter.updateFiftyMoveRuleCounter(piece, newPositionPiece);

    this.handlingSpecialMoves(piece, prevX, prevY, newX, newY, moveType);
    this.pieceMover.updateMoveState(piece);
    const prometedPiece = this.chessBoard.promotedPiece(
      promotedPieceType,
      this._playerTurn
    );

    this.chessBoard.applyMove(
      prevX,
      prevY,
      newX,
      newY,
      prometedPiece,
      moveType
    );
    this.swapPlyer();
    this.updateMoveHistory(prevX, prevY, newX, newY, moveType);

    const updatedSafeCoords = this.pieceMover.findSafeCoords(
      this.chessBoard.board,
      {
        isInCheck: this.chessHistory.checkState.isInCheck,
        lastMove: this.chessHistory.lastMove,
        currentPlayer: this._playerTurn,
      }
    );
    const checkMove = this.updateCheckState(
      moveType.size,
      updatedSafeCoords.size
    );
    if (checkMove) moveType.add(checkMove);

    this.updateGameState(updatedSafeCoords, promotedPieceType);
  }

  private getMoveType(newX: number, newY: number) {
    const moveType = new Set<MoveType>();
    const takenPiece = this.chessBoard.board[newX][newY];

    if (takenPiece && !takenPiece.isEmpty()) {
      moveType.add(MoveType.Capture);
    }

    return moveType;
  }

  private updateCheckState(moveTypeSize: number, safeCoordsSize: number) {
    const checkState = this.pieceMover.validator.isInCheck(
      this.chessBoard.board,
      this._playerTurn
    );
    this.chessHistory.setCheckState(checkState);

    if (checkState.isInCheck) {
      return !safeCoordsSize ? MoveType.CheckMate : MoveType.Check;
    } else if (!moveTypeSize) {
      return MoveType.BasicMove;
    }
    return null;
  }

  private updateGameState(
    updatedSafeCoords: SafeCoords,
    promotedPieceType: PieceSymbol | null
  ) {
    this.chessHistory.storeMove(
      promotedPieceType || PieceSymbol.UNKNOWN,
      this.chessBoard.board,
      this.pieceMover.safeCoords,
      this.moveCounter.fullNumberOfMoves
    );
    this.chessHistory.updateHistory(this.currentChessBoardView);

    this.pieceMover.setSafeCoords(updatedSafeCoords);
    this.moveCounter.updateFullMoveCounter(this._playerTurn);
    this.updateBoardAsSymbols();

    this._isGameOver = this.isGameFinished();
  }

  /**
   * Maneja los movimientos especiales en el ajedrez, como el enroque y la captura al paso.
   *
   * @param piece - La pieza que realiza el movimiento.
   * @param prevX - La coordenada X anterior de la pieza.
   * @param prevY - La coordenada Y anterior de la pieza.
   * @param newX - La coordenada X nueva de la pieza.
   * @param newY - La coordenada Y nueva de la pieza.
   * @param moveType - Un conjunto de tipos de movimiento que se actualizan según el tipo de movimiento especial realizado.
   */
  private handlingSpecialMoves(
    piece: Piece,
    prevX: number,
    prevY: number,
    newX: number,
    newY: number,
    moveType: Set<MoveType>
  ): void {
    const lastMove = this.chessHistory.lastMove;

    if (piece instanceof KingPiece && Math.abs(newY - prevY) === 2) {
      this.handleCastling(prevX, prevY, newX, newY, moveType);
    } else if (
      piece instanceof PawnPiece &&
      lastMove &&
      lastMove.piece instanceof PawnPiece &&
      Math.abs(lastMove.currX - lastMove.prevX) === 2 &&
      prevX === lastMove.currX &&
      newY === lastMove.currY
    ) {
      this.handleEnPassant(lastMove.currX, lastMove.currY, moveType);
    }
  }

  /**
   * Maneja el movimiento de enroque.
   *
   * @param prevX - La coordenada X anterior del rey.
   * @param prevY - La coordenada Y anterior del rey.
   * @param newX - La coordenada X nueva del rey.
   * @param newY - La coordenada Y nueva del rey.
   * @param moveType - Un conjunto de tipos de movimiento que se actualizan con el tipo de movimiento especial realizado.
   */
  private handleCastling(
    prevX: number,
    prevY: number,
    newX: number,
    newY: number,
    moveType: Set<MoveType>
  ): void {
    // Determine la posición inicial y final de la torre
    const rookPositionY = newY > prevY ? 7 : 0;
    const rookNewPositionY = newY > prevY ? 5 : 3;
    const rook = this.chessBoard.board[prevX][rookPositionY] as RookPiece;

    // Mueve la torre a su nueva posición
    this.chessBoard.removePiece(prevX, rookPositionY);
    this.chessBoard.addOrMovePiece(prevX, rookNewPositionY, rook);
    rook.updateMoved();

    // Actualiza el tipo de movimiento
    moveType.add(MoveType.Castling);
  }

  /**
   * Maneja la captura al paso de un peón.
   *
   * @param captureX - La coordenada X de la posición donde el peón fue capturado al paso.
   * @param captureY - La coordenada Y de la posición donde el peón fue capturado al paso.
   * @param moveType - Un conjunto de tipos de movimiento que se actualizan con el tipo de movimiento especial realizado.
   */
  private handleEnPassant(
    captureX: number,
    captureY: number,
    moveType: Set<MoveType>
  ): void {
    // Elimina el peón capturado al paso
    this.chessBoard.removePiece(captureX, captureY);

    // Actualiza el tipo de movimiento
    moveType.add(MoveType.Capture);
  }

  /**
   * Verifica si el juego ha terminado y establece el tipo de finalización del juego.
   *
   * @returns `true` si el juego ha terminado, `false` en caso contrario.
   */
  private isGameFinished(): boolean {
    const checkState = this.chessHistory.checkState;
    const safeCoords = this.pieceMover.safeCoords;

    // Verifica material insuficiente
    if (this.chessBoard.insufficientMaterial()) {
      this._gameOverType = ChessGameOverType.DRAW_BY_INSUFFICIENT_MATERIAL;
      return true;
    }

    // Verifica si no hay movimientos seguros restantes
    if (!safeCoords.size) {
      if (checkState.isInCheck) {
        // Jaque mate
        this._gameOverType =
          this._playerTurn === ChessPlayers.WHITE
            ? ChessGameOverType.CHECK_MATE_BLACK
            : ChessGameOverType.CHECK_MATE_WHITE;
      } else {
        // Ahogado
        this._gameOverType = ChessGameOverType.DRAW_BY_DROWNED;
      }

      return true;
    }

    // Verifica la regla de tres repeticiones
    if (this.moveCounter.threeFoldRepetitionFlag) {
      this._gameOverType = ChessGameOverType.DRAW_BY_REPETITION;
      return true;
    }

    // Verifica la regla de los cincuenta movimientos
    if (this.moveCounter.isFulfilledFiftyRuleCounter()) {
      this._gameOverType = ChessGameOverType.DRAW_BY_FIFTYMOVES_RULE;
      return true;
    }

    // El juego no ha terminado
    return false;
  }

  private updateMoveHistory(
    prevX: number,
    prevY: number,
    newX: number,
    newY: number,
    moveType: Set<MoveType>
  ): void {
    this.chessHistory.setLastMove({
      prevX,
      prevY,
      currX: newX,
      currY: newY,
      piece: this.chessBoard.board[newX][newY],
      moveType,
    });
  }

  private updateBoardAsSymbols(): void {
    this._boardAsSymbols = this.converter.convertBoardToSymbol(
      this.chessBoard.board,
      this._playerTurn,
      this.chessHistory.lastMove,
      this.moveCounter.fiftyMoveRuleCounter,
      this.moveCounter.fullNumberOfMoves
    );
    this.moveCounter.updateThreeFoldRepetitionDictionary(this._boardAsSymbols);
  }

  public swapPlyer() {
    const whiteIsPlaying = this._playerTurn === ChessPlayers.WHITE;
    this._playerTurn = whiteIsPlaying ? ChessPlayers.BLACK : ChessPlayers.WHITE;
  }

  public get board(): Piece[][] {
    return this.chessBoard.board;
  }

  public get playerGo(): ChessPlayers {
    return this._playerTurn;
  }

  public get gameOverType() {
    return this._gameOverType;
  }
  public get isGameOver() {
    return this._isGameOver;
  }
  public get isPaused() {
    return this._isPaused();
  }
  public set isPaused(updated) {
    this._isPaused.set(updated);
  }

  public get boardAsSymbols() {
    return this._boardAsSymbols;
  }
  public get currentChessBoardView() {
    return this.chessBoard.chessBoardView();
  }
  public get gameHistory() {
    return this.chessHistory;
  }
  public get history() {
    return this.chessHistory.gameHistory;
  }
  public get safeCoords() {
    return this.pieceMover.safeCoords;
  }
}
