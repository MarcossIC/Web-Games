import { Injectable } from '@angular/core';
import { Piece } from '@app/data/services/chess/Piece';
import { CheckState } from '@app/data/models/chess/chess-checkstate';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import KingPiece from '@app/data/services/chess/KingPiece';
import KnightPiece from '@app/data/services/chess/KnightPiece';
import PawnPiece from '@app/data/services/chess/PawnPiece';
import RookPiece from '@app/data/services/chess/RookPiece';
import { BOARD_ROW_SIZE } from 'assets/constants/chess';

@Injectable()
export class ChessMoveValidator {
  public notInCheck(): CheckState {
    return { isInCheck: false, x: undefined, y: undefined };
  }

  public isValidPieceForCurrentPlayer(
    currentPlayer: ChessPlayers,
    piece: Piece | null
  ) {
    return !piece || piece.isEmpty() || piece.player === currentPlayer;
  }

  public areCoordsValid(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < BOARD_ROW_SIZE && y < BOARD_ROW_SIZE;
  }

  /**
   * Checks if the player's king is in check.
   *
   * @param player - The color of the player being verified.
   * @param checkingCurrentPosition - If true, the internal state `_checkState` will be updated with information about the check.
   * @returns True if the player's king is in check, false otherwise.
   */
  public isInCheck(board: Piece[][], player: ChessPlayers): CheckState {
    //Go around the board
    for (let x = 0; x < BOARD_ROW_SIZE; x++) {
      for (let y = 0; y < BOARD_ROW_SIZE; y++) {
        const piece: Piece | null = board[x][y];
        //If there is no piece or the piece is the same color as the player, continue to the next iteration.
        if (this.isValidPieceForCurrentPlayer(player, piece)) {
          continue;
        }

        //It goes through all possible directions of movement of the piece.
        for (const { x: dx, y: dy } of piece.directions) {
          let newX: number = x + dx;
          let newY: number = y + dy;
          //If are valid continue
          if (!this.areCoordsValid(newX, newY)) {
            continue;
          }

          if (
            piece instanceof PawnPiece ||
            piece instanceof KnightPiece ||
            piece instanceof KingPiece
          ) {
            // Pawns cannot attack on the same file.
            if (piece instanceof PawnPiece && dy === 0) {
              continue;
            }

            const attackedPiece: Piece | null = board[newX][newY];
            //If the attacked piece is a king of the same color as the player, returns true.
            if (
              attackedPiece instanceof KingPiece &&
              attackedPiece.player === player
            ) {
              return { isInCheck: true, x: newX, y: newY };
            }
          } else {
            while (this.areCoordsValid(newX, newY)) {
              const attackedPiece: Piece | null = board[newX][newY];
              //If the attacked piece is a king of the same color as the player, returns true.
              if (
                attackedPiece instanceof KingPiece &&
                attackedPiece.player === player
              ) {
                return { isInCheck: true, x: newX, y: newY };
              }
              //If it finds a piece, it stops the loop.
              if (attackedPiece !== null && !attackedPiece.isEmpty()) {
                break;
              }

              //Moves to the next position in the current direction.
              newX += dx;
              newY += dy;
            }
          }
        }
      }
    }

    return this.notInCheck();
  }

  public isPositionSafeAfterMove(
    board: Piece[][],
    prevX: number,
    prevY: number,
    newX: number,
    newY: number
  ): boolean {
    const piece: Piece = board[prevX][prevY];
    if (!piece || piece.isEmpty()) {
      return false;
    }
    const newPiece: Piece | null = board[newX][newY];
    if (newPiece && !newPiece.isEmpty() && newPiece.player === piece.player) {
      return false;
    }

    // simulate position
    board[prevX][prevY] = Piece.createEmpty();
    board[newX][newY] = piece;
    const isPositionSafe = !this.isInCheck(board, piece.player).isInCheck;

    // restore position back
    board[prevX][prevY] = piece;
    board[newX][newY] = newPiece;

    return isPositionSafe;
  }

  public getKingMoveCoords(
    board: Piece[][],
    king: KingPiece,
    isInCheck: boolean,
    kingSideCastle: boolean
  ) {
    if (king.hasMoved) {
      return null;
    }

    const kingPositionX: number = king.player === ChessPlayers.WHITE ? 7 : 0;
    const kingPositionY: number = 4;
    const rookPositionX: number = kingPositionX;
    const rookPositionY: number = kingSideCastle ? 7 : 0;

    const rook: Piece | null = board[rookPositionX][rookPositionY];

    if (!(rook instanceof RookPiece) || rook.hasMoved || isInCheck) {
      return null;
    }

    const firstNextKingPositionY: number =
      kingPositionY + (kingSideCastle ? 1 : -1);
    const secondNextKingPositionY: number =
      kingPositionY + (kingSideCastle ? 2 : -2);

    if (
      !board[kingPositionX][firstNextKingPositionY].isEmpty() ||
      !board[kingPositionX][secondNextKingPositionY].isEmpty()
    ) {
      return null;
    }

    if (!kingSideCastle && board[kingPositionX][1]) return null;

    return {
      kingPositionX,
      kingPositionY,
      firstNextKingPositionY,
      secondNextKingPositionY,
    };
  }
}
