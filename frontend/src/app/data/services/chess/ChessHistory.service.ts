import { Injectable } from '@angular/core';
import { Piece } from '@app/data/services/chess/Piece';
import { CheckState } from '@app/data/models/chess/chess-checkstate';
import { SafeCoords } from '@app/data/models/chess/chess-coords';
import { LastMove, MoveType } from '@app/data/models/chess/chess-lastmove';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import KingPiece from '@app/data/services/chess/KingPiece';
import PawnPiece from '@app/data/services/chess/PawnPiece';
import { BOARD_ROW_SIZE, columns } from 'assets/constants/chess';

type GameHistory = {
  lastMove: LastMove | undefined;
  checkState: CheckState;
  board: PieceSymbol[][];
};

type MoveList = [string, string?];

@Injectable()
export class ChessHistory {
  private _lastMove: LastMove | undefined;
  private _checkState: CheckState;
  private _gameHistory: GameHistory[];
  private _moveList: MoveList[];
  private _fullNumberOfMoves: number;

  constructor() {
    this._gameHistory = [];
    this._checkState = { isInCheck: false };
    this._fullNumberOfMoves = 1;
    this._moveList = [];
  }

  public resetAllHistory() {
    this._gameHistory = [];
    this._checkState = { isInCheck: false };
    this._fullNumberOfMoves = 1;
    this._moveList = [];
  }

  public storeMove(
    promotedPiece: PieceSymbol,
    board: Piece[][],
    pieceSafeCoords: SafeCoords
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

      move += columns[currY] + String(currX + 1);

      if (promotedPiece) {
        move += '=' + promotedPiece.toUpperCase();
      }
    }

    if (moveType.has(MoveType.Check)) {
      move += '+';
    } else if (moveType.has(MoveType.CheckMate)) {
      move += '#';
    }

    if (!this._moveList[this._fullNumberOfMoves - 1]) {
      this._moveList[this._fullNumberOfMoves - 1] = [move];
    } else {
      this._moveList[this._fullNumberOfMoves - 1].push(move);
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

    // means that all of the pieces are on different files (a, b, c, ...)
    if (piecesFile.size === samePiecesCoords.length) return columns[prevY];

    // means that all of the pieces are on different rank (1, 2, 3, ...)
    if (piecesRank.size === samePiecesCoords.length) return String(prevX + 1);

    // in case that there are pieces that shares both rank and a file with multiple or one piece
    return columns[prevY] + String(prevX + 1);
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

  public get fullNumberOfMoves() {
    return this._fullNumberOfMoves;
  }
  public sumFullNumberOfMoves() {
    this._fullNumberOfMoves++;
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
}
