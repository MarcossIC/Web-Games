import { Injectable, inject } from '@angular/core';
import { Coords, SafeCoords } from '@app/data/models/chess/chess-coords';
import { ChessGameState } from '@app/data/models/chess/chess-gamestate';
import { LastMove } from '@app/data/models/chess/chess-lastmove';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { ChessMoveValidator } from '@app/data/services/chess/ChessMoveValidator.service';
import KingPiece from '@app/data/services/chess/KingPiece';
import KnightPiece from '@app/data/services/chess/KnightPiece';
import PawnPiece from '@app/data/services/chess/PawnPiece';
import { Piece } from '@app/data/services/chess/Piece';
import RookPiece from '@app/data/services/chess/RookPiece';
import { BOARD_ROW_SIZE } from 'assets/constants/chess';

@Injectable()
export class ChessPieceMover {
  private _validator = inject(ChessMoveValidator);
  private _safeCoords: SafeCoords;

  constructor() {
    this._safeCoords = new Map();
  }

  public resetSafeCoords() {
    this._safeCoords = new Map();
  }

  public isValidMove(prevX: number, prevY: number, newX: number, newY: number) {
    return (
      this._validator.areCoordsValid(prevX, prevY) &&
      this._validator.areCoordsValid(newX, newY)
    );
  }

  public checkSafeCoords(
    prevX: number,
    prevY: number,
    newX: number,
    newY: number
  ) {
    const safeCoords: Coords[] | undefined = this._safeCoords.get(
      `${prevX},${prevY}`
    );
    if (
      !safeCoords ||
      !safeCoords.some((coords) => coords.x === newX && coords.y === newY)
    ) {
      throw new Error('Square is not safe');
    }
  }

  public updateMoveState(piece: Piece) {
    if (
      (piece instanceof PawnPiece ||
        piece instanceof KingPiece ||
        piece instanceof RookPiece) &&
      !piece.hasMoved
    ) {
      piece.updateMoved();
    }
  }

  public updateSafeCoords(board: Piece[][], game: ChessGameState) {
    this._safeCoords = this.findSafeCoords(board, game);
  }

  public setSafeCoords(updated: SafeCoords) {
    this._safeCoords = updated;
  }

  public findSafeCoords(board: Piece[][], game: ChessGameState): SafeCoords {
    const safeCoords: SafeCoords = new Map<string, Coords[]>();

    for (let x = 0; x < BOARD_ROW_SIZE; x++) {
      for (let y = 0; y < BOARD_ROW_SIZE; y++) {
        const piece: Piece = board[x][y];
        if (piece.isEmpty() || piece.player !== game.currentPlayer) {
          continue;
        }

        const pieceSafeCoords: Coords[] = [];
        let counter = 0;
        for (const { x: dx, y: dy } of piece.directions) {
          counter++;
          let newX: number = x + dx;
          let newY: number = y + dy;

          if (!this._validator.areCoordsValid(newX, newY)) {
            continue;
          }
          let newPiece: Piece = board[newX][newY];

          if (!newPiece.isEmpty() && newPiece.player === piece.player) {
            continue;
          }
          // need to restrict pawn moves in certain directions
          if (piece instanceof PawnPiece) {
            // cant move pawn two squares straight if there is piece infront of him
            if (dx === 2 || dx === -2) {
              if (newPiece && !newPiece.isEmpty()) {
                continue;
              }
              const posiblePiece: Piece | null =
                board[newX + (dx === 2 ? -1 : 1)][newY];
              if (
                !this._validator.areCoordsValid(newX, newY) ||
                (posiblePiece && !posiblePiece.isEmpty())
              ) {
                continue;
              }
            }

            // cant move pawn one square straight if piece is infront of him
            if (
              (dx === 1 || dx === -1) &&
              dy === 0 &&
              newPiece &&
              !newPiece.isEmpty()
            ) {
              continue;
            }

            // cant move pawn diagonally if there is no piece, or piece has same color as pawn
            if (
              (dy === 1 || dy === -1) &&
              (!newPiece ||
                newPiece.isEmpty() ||
                piece.player === newPiece.player)
            ) {
              continue;
            }
          }

          if (
            piece instanceof PawnPiece ||
            piece instanceof KnightPiece ||
            piece instanceof KingPiece
          ) {
            const isPositionSafe = this._validator.isPositionSafeAfterMove(
              board,
              x,
              y,
              newX,
              newY
            );

            if (isPositionSafe) {
              pieceSafeCoords.push({ x: newX, y: newY });
            }
          } else {
            while (this._validator.areCoordsValid(newX, newY)) {
              newPiece = board[newX][newY];
              if (
                newPiece &&
                !newPiece.isEmpty() &&
                newPiece.player === piece.player
              )
                break;

              const isPositionSafe = this._validator.isPositionSafeAfterMove(
                board,
                x,
                y,
                newX,
                newY
              );
              if (isPositionSafe) pieceSafeCoords.push({ x: newX, y: newY });

              if (newPiece !== null && !newPiece.isEmpty()) break;

              newX += dx;
              newY += dy;
            }
          }
        }

        if (piece instanceof KingPiece) {
          if (this.canCastle(piece, true, game.isInCheck, board)) {
            pieceSafeCoords.push({ x, y: 6 });
          }
          if (this.canCastle(piece, false, game.isInCheck, board)) {
            pieceSafeCoords.push({ x, y: 2 });
          }
        } else if (
          piece instanceof PawnPiece &&
          this.canCaptureEnPassant(
            game.lastMove,
            game.currentPlayer,
            piece,
            x,
            y,
            board
          )
        ) {
          pieceSafeCoords.push({
            x: x + (piece.player === ChessPlayers.WHITE ? -1 : 1),
            y: game.lastMove!.prevY,
          });
        }

        if (pieceSafeCoords.length)
          safeCoords.set(x + ',' + y, pieceSafeCoords);
      }
    }

    return safeCoords;
  }

  private canCaptureEnPassant(
    lastMove: LastMove | undefined,
    currentPlayer: ChessPlayers,
    pawn: PawnPiece,
    pawnX: number,
    pawnY: number,
    board: Piece[][]
  ): boolean {
    if (!lastMove) return false;
    const { piece, prevX, prevY, currX, currY } = lastMove;

    if (
      !(piece instanceof PawnPiece) ||
      pawn.player !== currentPlayer ||
      Math.abs(currX - prevX) !== 2 ||
      pawnX !== currX ||
      Math.abs(pawnY - currY) !== 1
    ) {
      return false;
    }

    const pawnNewPositionX: number =
      pawnX + (pawn.player === ChessPlayers.WHITE ? -1 : 1);
    const pawnNewPositionY: number = currY;

    board[currX][currY] = Piece.createEmpty();

    const isPositionSafe = this._validator.isPositionSafeAfterMove(
      board,
      pawnX,
      pawnY,
      pawnNewPositionX,
      pawnNewPositionY
    );

    board[currX][currY] = piece;

    return isPositionSafe;
  }

  private canCastle(
    king: KingPiece,
    kingSideCastle: boolean,
    isInCheck: boolean,
    board: Piece[][]
  ): boolean {
    const kingMoves = this._validator.getKingMoveCoords(
      board,
      king,
      isInCheck,
      kingSideCastle
    );

    if (!kingMoves) return false;

    const isPositionSafeInFirstPosition =
      this._validator.isPositionSafeAfterMove(
        board,
        kingMoves.kingPositionX,
        kingMoves.kingPositionY,
        kingMoves.kingPositionX,
        kingMoves.firstNextKingPositionY
      );
    const isPositionSafeInSecondPosition =
      this._validator.isPositionSafeAfterMove(
        board,
        kingMoves.kingPositionX,
        kingMoves.kingPositionY,
        kingMoves.kingPositionX,
        kingMoves.secondNextKingPositionY
      );

    return isPositionSafeInFirstPosition && isPositionSafeInSecondPosition;
  }

  public get validator() {
    return this._validator;
  }

  public get safeCoords() {
    return this._safeCoords;
  }
}
