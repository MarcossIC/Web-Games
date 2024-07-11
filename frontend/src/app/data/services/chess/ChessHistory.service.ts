import { Injectable } from '@angular/core';
import { Piece } from '@app/data/services/chess/Piece';
import { CheckState } from '@app/data/models/chess/chess-checkstate';
import { SafeCoords } from '@app/data/models/chess/chess-coords';
import { LastMove, MoveType } from '@app/data/models/chess/chess-lastmove';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import KingPiece from '@app/data/services/chess/KingPiece';
import PawnPiece from '@app/data/services/chess/PawnPiece';
import { BOARD_ROW_SIZE, columns } from 'assets/constants/chess';
import {
  GameHistory,
  MoveList,
} from '@app/data/models/chess/chess-history-move';

@Injectable()
export class ChessHistory {
  private _lastMove: LastMove | undefined;
  private _checkState: CheckState;
  private _gameHistory: GameHistory[];
  private _moveList: MoveList;
  private _gameHistoryPointer: number;

  constructor() {
    this._gameHistory = [];
    this._checkState = { isInCheck: false };
    this._moveList = [];
    this._gameHistoryPointer = 0;
  }

  public resetAllHistory() {
    this._lastMove = undefined;
    this._checkState = { isInCheck: false };
    this._gameHistory = [];
    this._moveList = [];
    this._gameHistoryPointer = 0;
  }

  public storeMove(
    promotedPiece: PieceSymbol,
    board: Piece[][],
    pieceSafeCoords: SafeCoords,
    movesNumber: number
  ): void {
    const { piece, currX, currY, prevX, prevY, moveType } = this._lastMove!;
    let pieceName: string = !(piece instanceof PawnPiece)
      ? piece.symbol.toUpperCase()
      : '';
    let move: string;

    if (moveType.has(MoveType.Castling)) {
      move = currY - prevY === 2 ? 'O-O' : 'O-O-O';
    } else {
      move =
        pieceName + this.startingPieceCoordsNotation(board, pieceSafeCoords);
      if (moveType.has(MoveType.Capture)) {
        move += piece instanceof PawnPiece ? columns[prevY] + 'x' : 'x';
      }

      move += columns[currY] + String(8 - currX);

      if (promotedPiece !== PieceSymbol.UNKNOWN) {
        move += '=' + promotedPiece.toUpperCase();
      }
    }

    if (moveType.has(MoveType.Check)) {
      move += '+';
    } else if (moveType.has(MoveType.CheckMate)) {
      move += '#';
    }

    if (!this._moveList[movesNumber - 1]) {
      this._moveList[movesNumber - 1] = [move];
    } else {
      this._moveList[movesNumber - 1].push(move);
    }
  }

  public startingPieceCoordsNotation(
    board: Piece[][],
    pieceSafeCoords: SafeCoords
  ): string {
    const { piece: currPiece, prevX, prevY, currX, currY } = this._lastMove!;
    if (currPiece instanceof PawnPiece || currPiece instanceof KingPiece)
      return '';

    const samePiecesCoords = [{ x: prevX, y: prevY }];

    for (let x = 0; x < BOARD_ROW_SIZE; x++) {
      for (let y = 0; y < BOARD_ROW_SIZE; y++) {
        const piece: Piece | null = board[x][y];
        if (!piece || piece.isEmpty() || (currX === x && currY === y)) continue;

        if (piece.symbol === currPiece.symbol) {
          const safeCoords = pieceSafeCoords.get(x + ',' + y) || [];
          const pieceHasSameTargetSquare = safeCoords.some(
            (coords) => coords.x === currX && coords.y === currY
          );
          if (pieceHasSameTargetSquare) samePiecesCoords.push({ x, y });
        }
      }
    }

    if (samePiecesCoords.length === 1) return '';

    const piecesFile = new Set(samePiecesCoords.map((coords) => coords.y));
    const piecesRank = new Set(samePiecesCoords.map((coords) => coords.x));

    if (piecesFile.size === samePiecesCoords.length) return columns[prevY];
    if (piecesRank.size === samePiecesCoords.length) return String(8 - prevX);

    return columns[prevY] + String(8 - prevX);
  }

  public get lastMove() {
    return this._lastMove;
  }

  public get gameHistory() {
    return this._gameHistory;
  }

  public get checkState() {
    return this._checkState;
  }

  public get moveList() {
    return this._moveList;
  }

  public setCheckState(updated: CheckState) {
    this._checkState = updated;
  }

  public setLastMove(updated: LastMove | undefined) {
    this._lastMove = updated;
  }

  public setGameHistory(updated: GameHistory[]) {
    this._gameHistory = updated;
  }

  public updateHistory(boardInSymbol: PieceSymbol[][]) {
    this.addHistory({
      board: [...boardInSymbol.map((row) => [...row])],
      checkState: { ...this._checkState },
      lastMove: this._lastMove ? { ...this._lastMove } : undefined,
    });
  }

  public addHistory(updated: GameHistory) {
    this._gameHistory.push(updated);
  }

  public resetHistory() {
    this._gameHistory = [];
  }

  public advanceHistoryPointer() {
    this._gameHistoryPointer++;
  }
  public goBackHistoryPointer() {
    this._gameHistoryPointer--;
  }
  public moveHistoryPointerTo(to: number) {
    this._gameHistoryPointer = to;
  }

  public get gameHistoryPointer() {
    return this._gameHistoryPointer;
  }
}
