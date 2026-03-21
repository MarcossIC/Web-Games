import { Injectable, inject } from '@angular/core';
import { ChessBoard } from '@app/data/services/chess/ChessBoard.service';
import { Piece } from '@app/data/services/chess/Piece';
import { ChessHistory } from '@app/data/services/chess/ChessHistory.service';
import { ChessPieceMover } from '@app/data/services/chess/ChessPieceMover.service';
import { ChessCaptureCounter } from '@app/data/services/chess/ChessCaptureCounter.service';
import { ChessMoveCounter } from '@app/data/services/chess/ChessMoveCounter.service';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { MoveType } from '@app/data/models/chess/chess-lastmove';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import PawnPiece from '@app/data/services/chess/PawnPiece';
import KingPiece from '@app/data/services/chess/KingPiece';
import RookPiece from '@app/data/services/chess/RookPiece';

@Injectable()
export class ChessMoveHandler {
  private chessBoard = inject(ChessBoard);
  private chessHistory = inject(ChessHistory);
  private pieceMover = inject(ChessPieceMover);
  private captureCounter = inject(ChessCaptureCounter);
  private moveCounter = inject(ChessMoveCounter);

  /**
   * Valida y ejecuta un movimiento en el tablero.
   * Retorna el moveType resultante, o null si el movimiento no es válido.
   */
  public executeMove(
    prevX: number,
    prevY: number,
    newX: number,
    newY: number,
    playerTurn: ChessPlayers,
    promotedPieceType: PieceSymbol | null
  ): Set<MoveType> | null {
    if (!this.pieceMover.isValidMove(prevX, prevY, newX, newY)) {
      return null;
    }

    const piece: Piece = this.chessBoard.board[prevX][prevY];
    if (!piece.isPieceMovable(playerTurn)) return null;

    const newPositionPiece: Piece = this.chessBoard.board[newX][newY];
    this.pieceMover.checkSafeCoords(prevX, prevY, newX, newY);

    const moveType = this.getMoveType(newX, newY);
    this.captureCounter.updateCounter(
      moveType,
      playerTurn,
      promotedPieceType || PieceSymbol.UNKNOWN,
      newPositionPiece.symbol
    );
    this.moveCounter.updateFiftyMoveRuleCounter(piece, newPositionPiece);

    this.handleSpecialMoves(piece, prevX, prevY, newX, newY, moveType);
    this.pieceMover.updateMoveState(piece);

    const promotedPiece = this.chessBoard.promotedPiece(
      promotedPieceType,
      playerTurn
    );
    this.chessBoard.applyMove(prevX, prevY, newX, newY, promotedPiece, moveType);

    return moveType;
  }

  public updateMoveHistory(
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

  private getMoveType(newX: number, newY: number): Set<MoveType> {
    const moveType = new Set<MoveType>();
    const takenPiece = this.chessBoard.board[newX][newY];

    if (takenPiece && !takenPiece.isEmpty()) {
      moveType.add(MoveType.Capture);
    }

    return moveType;
  }

  /**
   * Maneja los movimientos especiales en el ajedrez, como el enroque y la captura al paso.
   */
  private handleSpecialMoves(
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
   */
  private handleCastling(
    prevX: number,
    prevY: number,
    newX: number,
    newY: number,
    moveType: Set<MoveType>
  ): void {
    const rookPositionY = newY > prevY ? 7 : 0;
    const rookNewPositionY = newY > prevY ? 5 : 3;
    const rook = this.chessBoard.board[prevX][rookPositionY] as RookPiece;

    this.chessBoard.removePiece(prevX, rookPositionY);
    this.chessBoard.addOrMovePiece(prevX, rookNewPositionY, rook);
    rook.updateMoved();

    moveType.add(MoveType.Castling);
  }

  /**
   * Maneja la captura al paso de un peón.
   */
  private handleEnPassant(
    captureX: number,
    captureY: number,
    moveType: Set<MoveType>
  ): void {
    this.chessBoard.removePiece(captureX, captureY);
    moveType.add(MoveType.Capture);
  }
}
