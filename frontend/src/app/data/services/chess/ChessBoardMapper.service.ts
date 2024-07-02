import { Injectable } from '@angular/core';
import { Piece } from '@app/data/models/chess/Piece';
import { LastMove } from '@app/data/models/chess/chess-lastmove';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import KingPiece from '@app/data/services/chess/KingPiece';
import PawnPiece from '@app/data/services/chess/PawnPiece';
import RookPiece from '@app/data/services/chess/RookPiece';
import { columns } from 'assets/constants/chess';

@Injectable()
export class ChessBoardMapper {
  public static readonly DEFAULT_INITIAL_POSITION: string =
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  public convertBoardToSymbol(
    board: Piece[][],
    currentPlayer: ChessPlayers,
    lastMove: LastMove | undefined,
    fiftyMoveRuleCounter: number,
    numberOfFullMoves: number
  ): string {
    let symbol: string = '';

    for (let i = 7; i >= 0; i--) {
      let symbolRow: string = '';
      let consecutiveEmptySquaresCounter = 0;

      for (const piece of board[i]) {
        if (!piece || piece.isEmpty()) {
          consecutiveEmptySquaresCounter++;
          continue;
        }

        if (consecutiveEmptySquaresCounter !== 0) {
          symbolRow += String(consecutiveEmptySquaresCounter);
        }

        consecutiveEmptySquaresCounter = 0;
        symbolRow += piece.symbol;
      }

      if (consecutiveEmptySquaresCounter !== 0) {
        symbolRow += String(consecutiveEmptySquaresCounter);
      }

      symbol += i === 0 ? symbolRow : symbolRow + '/';
    }

    const player: string = currentPlayer === ChessPlayers.WHITE ? 'w' : 'b';
    symbol += ' ' + player;
    symbol += ' ' + this.castlingAvailability(board);
    symbol += ' ' + this.enPassantPosibility(lastMove, currentPlayer);
    symbol += ' ' + fiftyMoveRuleCounter * 2;
    symbol += ' ' + numberOfFullMoves;
    return symbol;
  }

  private castlingPossibilities(
    board: Piece[][],
    player: ChessPlayers
  ): string {
    let castlingAvailability: string = '';

    const kingPositionX: number = player === ChessPlayers.WHITE ? 0 : 7;
    const king: Piece | null = board[kingPositionX][4];

    if (!king.isEmpty() && king instanceof KingPiece && !king.hasMoved) {
      const rookPositionX: number = kingPositionX;
      const kingSideRook = board[rookPositionX][7];
      const queenSideRook = board[rookPositionX][0];

      if (kingSideRook instanceof RookPiece && !kingSideRook.hasMoved)
        castlingAvailability += 'k';

      if (queenSideRook instanceof RookPiece && !queenSideRook.hasMoved)
        castlingAvailability += 'q';

      if (player === ChessPlayers.WHITE)
        castlingAvailability = castlingAvailability.toUpperCase();
    }
    return castlingAvailability;
  }

  private castlingAvailability(board: Piece[][]): string {
    const castlingAvailability: string =
      this.castlingPossibilities(board, ChessPlayers.WHITE) +
      this.castlingPossibilities(board, ChessPlayers.BLACK);
    return castlingAvailability !== '' ? castlingAvailability : '-';
  }

  private enPassantPosibility(
    lastMove: LastMove | undefined,
    color: ChessPlayers
  ): string {
    if (!lastMove) return '-';
    const { piece, currX: newX, prevX, prevY } = lastMove;

    if (piece instanceof PawnPiece && Math.abs(newX - prevX) === 2) {
      const row: number = color === ChessPlayers.WHITE ? 6 : 3;
      return columns[prevY] + String(row);
    }
    return '-';
  }
}
