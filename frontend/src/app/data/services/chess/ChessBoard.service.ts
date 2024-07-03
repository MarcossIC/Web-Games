import BishopPiece from '@app/data/services/chess/BishopPiece';
import KingPiece from '@app/data/services/chess/KingPiece';
import KnightPiece from '@app/data/services/chess/KnightPiece';
import PawnPiece from '@app/data/services/chess/PawnPiece';
import { Piece } from '@app/data/models/chess/Piece';
import QueenPiece from '@app/data/services/chess/QueenPiece';
import RookPiece from '@app/data/services/chess/RookPiece';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { Coords, SafeCoords } from '@app/data/models/chess/chess-coords';
import { LastMove } from '@app/data/models/chess/chess-lastmove';
import { Injectable, inject } from '@angular/core';
import { ChessMoveValidator } from '@app/data/services/chess/ChessMoveValidator.service';
import { ChessGameState } from '@app/data/models/chess/chess-gamestate';

const BOARD_SIZE: number = 8;

@Injectable()
export class ChessBoard {
  public moveValidator = inject(ChessMoveValidator);
  protected _chessBoard: Piece[][];
  private _safeCoords: SafeCoords;

  constructor() {
    this._chessBoard = this.defaultBoard();
    this._safeCoords = new Map();
  }

  public defaultBoard() {
    return [
      [
        RookPiece.createPiece({ player: ChessPlayers.BLACK }),
        KnightPiece.createPiece({ player: ChessPlayers.BLACK }),
        BishopPiece.createPiece({ player: ChessPlayers.BLACK }),
        QueenPiece.createPiece({ player: ChessPlayers.BLACK }),
        KingPiece.createPiece({ player: ChessPlayers.BLACK }),
        BishopPiece.createPiece({ player: ChessPlayers.BLACK }),
        KnightPiece.createPiece({ player: ChessPlayers.BLACK }),
        RookPiece.createPiece({ player: ChessPlayers.BLACK }),
      ],
      [
        PawnPiece.createPiece({ player: ChessPlayers.BLACK }),
        PawnPiece.createPiece({ player: ChessPlayers.BLACK }),
        PawnPiece.createPiece({ player: ChessPlayers.BLACK }),
        PawnPiece.createPiece({ player: ChessPlayers.BLACK }),
        PawnPiece.createPiece({ player: ChessPlayers.BLACK }),
        PawnPiece.createPiece({ player: ChessPlayers.BLACK }),
        PawnPiece.createPiece({ player: ChessPlayers.BLACK }),
        PawnPiece.createPiece({ player: ChessPlayers.BLACK }),
      ],
      [
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
      ],
      [
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
      ],
      [
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
      ],
      [
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
        Piece.createEmpty(),
      ],
      [
        PawnPiece.createPiece({ player: ChessPlayers.WHITE }),
        PawnPiece.createPiece({ player: ChessPlayers.WHITE }),
        PawnPiece.createPiece({ player: ChessPlayers.WHITE }),
        PawnPiece.createPiece({ player: ChessPlayers.WHITE }),
        PawnPiece.createPiece({ player: ChessPlayers.WHITE }),
        PawnPiece.createPiece({ player: ChessPlayers.WHITE }),
        PawnPiece.createPiece({ player: ChessPlayers.WHITE }),
        PawnPiece.createPiece({ player: ChessPlayers.WHITE }),
      ],
      [
        RookPiece.createPiece({ player: ChessPlayers.WHITE }),
        KnightPiece.createPiece({ player: ChessPlayers.WHITE }),
        BishopPiece.createPiece({ player: ChessPlayers.WHITE }),
        QueenPiece.createPiece({ player: ChessPlayers.WHITE }),
        KingPiece.createPiece({ player: ChessPlayers.WHITE }),
        BishopPiece.createPiece({ player: ChessPlayers.WHITE }),
        KnightPiece.createPiece({ player: ChessPlayers.WHITE }),
        RookPiece.createPiece({ player: ChessPlayers.WHITE }),
      ],
    ];
  }

  public restart() {
    this._chessBoard = this.defaultBoard();
  }

  public chessBoardView() {
    return this._chessBoard.map((row) => row.map((piece) => piece.symbol));
  }

  public updateSafeCoords(game: ChessGameState) {
    this._safeCoords = this.findSafeCoords(game);
  }

  public setSafeCoords(updated: SafeCoords) {
    this._safeCoords = updated;
  }

  public findSafeCoords(game: ChessGameState): SafeCoords {
    const safeCoords: SafeCoords = new Map<string, Coords[]>();

    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        const piece: Piece = this._chessBoard[x][y];
        if (piece.isEmpty() || piece.player !== game.currentPlayer) {
          continue;
        }

        const pieceSafeCoords: Coords[] = [];
        let counter = 0;
        for (const { x: dx, y: dy } of piece.directions) {
          counter++;
          let newX: number = x + dx;
          let newY: number = y + dy;

          if (!this.moveValidator.areCoordsValid(newX, newY)) {
            continue;
          }
          let newPiece: Piece = this._chessBoard[newX][newY];

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
                this._chessBoard[newX + (dx === 2 ? -1 : 1)][newY];
              if (
                !this.moveValidator.areCoordsValid(newX, newY) ||
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
            const isPositionSafe = this.moveValidator.isPositionSafeAfterMove(
              this._chessBoard,
              x,
              y,
              newX,
              newY
            );

            if (isPositionSafe) {
              pieceSafeCoords.push({ x: newX, y: newY });
            }
          } else {
            while (this.moveValidator.areCoordsValid(newX, newY)) {
              newPiece = this._chessBoard[newX][newY];
              if (
                newPiece &&
                !newPiece.isEmpty() &&
                newPiece.player === piece.player
              )
                break;

              const isPositionSafe = this.moveValidator.isPositionSafeAfterMove(
                this._chessBoard,
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
          if (this.canCastle(piece, true, game.isInCheck)) {
            pieceSafeCoords.push({ x, y: 6 });
          }

          if (this.canCastle(piece, false, game.isInCheck)) {
            pieceSafeCoords.push({ x, y: 2 });
          }
        } else if (
          piece instanceof PawnPiece &&
          this.canCaptureEnPassant(
            game.lastMove,
            game.currentPlayer,
            piece,
            x,
            y
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
    pawnY: number
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

    this._chessBoard[currX][currY] = Piece.createEmpty();

    const isPositionSafe = this.moveValidator.isPositionSafeAfterMove(
      this._chessBoard,
      pawnX,
      pawnY,
      pawnNewPositionX,
      pawnNewPositionY
    );

    this._chessBoard[currX][currY] = piece;

    return isPositionSafe;
  }

  private canCastle(
    king: KingPiece,
    kingSideCastle: boolean,
    isInCheck: boolean
  ): boolean {
    const kingMoves = this.moveValidator.getKingMoveCoords(
      this._chessBoard,
      king,
      isInCheck,
      kingSideCastle
    );
  

    if (!kingMoves) return false;

    const isPositionSafeInFirstPosition =
      this.moveValidator.isPositionSafeAfterMove(
        this._chessBoard,
        kingMoves.kingPositionX,
        kingMoves.kingPositionY,
        kingMoves.kingPositionX,
        kingMoves.firstNextKingPositionY
      );
    const isPositionSafeInSecondPosition =
      this.moveValidator.isPositionSafeAfterMove(
        this._chessBoard,
        kingMoves.kingPositionX,
        kingMoves.kingPositionY,
        kingMoves.kingPositionX,
        kingMoves.secondNextKingPositionY
      );

    return isPositionSafeInFirstPosition && isPositionSafeInSecondPosition;
  }

  public get board() {
    return this._chessBoard;
  }

  public set board(updated: Piece[][]) {
    this._chessBoard = updated;
  }

  public get safeCoords() {
    return this._safeCoords;
  }

  public static isSquareWhite(x: number, y: number): boolean {
    // Reverse row to match checkerboard notation
    const actualRow = BOARD_SIZE - x;
    // Determine if the sum of row and column is even or odd
    return (actualRow + y) % 2 === 0;
  }
}
