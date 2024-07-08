import BishopPiece from '@app/data/services/chess/BishopPiece';
import KingPiece from '@app/data/services/chess/KingPiece';
import KnightPiece from '@app/data/services/chess/KnightPiece';
import PawnPiece from '@app/data/services/chess/PawnPiece';
import { Piece } from '@app/data/services/chess/Piece';
import QueenPiece from '@app/data/services/chess/QueenPiece';
import RookPiece from '@app/data/services/chess/RookPiece';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { Injectable } from '@angular/core';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { MoveType } from '@app/data/models/chess/chess-lastmove';
import { BOARD_ROW_SIZE } from 'assets/constants/chess';

const BOARD_SIZE: number = 8;
type PieceWithCoords = { piece: Piece; x: number; y: number };

@Injectable()
export class ChessBoard {
  protected _chessBoard: Piece[][];

  constructor() {
    this._chessBoard = this.defaultBoard();
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

  public applyMove(
    prevX: number,
    prevY: number,
    newX: number,
    newY: number,
    promotedPiece: Piece,
    moveType: Set<MoveType>
  ): void {
    if (!promotedPiece.isEmpty()) {
      this._chessBoard[newX][newY] = promotedPiece;
      moveType.add(MoveType.Promotion);
    } else {
      this._chessBoard[newX][newY] = this._chessBoard[prevX][prevY];
    }
    this.removePiece(prevX, prevY);
  }

  public promotedPiece(
    symbol: PieceSymbol | null,
    currentPlayer: ChessPlayers
  ): KnightPiece | BishopPiece | RookPiece | QueenPiece | Piece {
    if (!symbol || symbol === PieceSymbol.UNKNOWN) return Piece.createEmpty();
    const pieceOptions = {
      player: currentPlayer,
    };
    if (
      symbol === PieceSymbol.WHITE_KNIGHT ||
      symbol === PieceSymbol.BLACK_KNIGHT
    )
      return KnightPiece.createPiece(pieceOptions);

    if (
      symbol === PieceSymbol.WHITE_BISHOP ||
      symbol === PieceSymbol.BLACK_BISHOP
    )
      return BishopPiece.createPiece(pieceOptions);

    if (symbol === PieceSymbol.WHITE_ROOK || symbol === PieceSymbol.BLACK_ROOK)
      return RookPiece.createPiece(pieceOptions);

    return QueenPiece.createPiece(pieceOptions);
  }

  /**
   * Verifica si hay material insuficiente para que cualquiera de los jugadores pueda dar jaque mate.
   *
   * @returns `true` si hay material insuficiente para dar jaque mate, `false` en caso contrario.
   */
  public insufficientMaterial(): boolean {
    const whitePieces: PieceWithCoords[] = [];
    const blackPieces: PieceWithCoords[] = [];

    // Clasifica las piezas por color && Guarda sus coordenadas
    for (let x = 0; x < BOARD_ROW_SIZE; x++) {
      for (let y = 0; y < BOARD_ROW_SIZE; y++) {
        const piece: Piece | null = this._chessBoard[x][y];
        if (!piece || piece.isEmpty()) continue;

        if (piece.player === ChessPlayers.WHITE)
          whitePieces.push({ piece, x, y });
        else blackPieces.push({ piece, x, y });
      }
    }

    // Verifica los casos de insuficiencia de material
    return (
      this.isKingVsKing(whitePieces, blackPieces) ||
      this.isKingAndMinorPieceVsKing(whitePieces, blackPieces) ||
      this.isBothSidesBishopsOfSameColor(whitePieces, blackPieces) ||
      this.isKingAndTwoKnightsVsKing(whitePieces, blackPieces) ||
      this.isOnlyBishopsOfSameColorAndKing(whitePieces, blackPieces)
    );
  }

  // Caso: Rey contra Rey
  private isKingVsKing(
    whitePieces: PieceWithCoords[],
    blackPieces: PieceWithCoords[]
  ): boolean {
    return whitePieces.length === 1 && blackPieces.length === 1;
  }

  // Caso: Rey y una pieza menor contra Rey
  private isKingAndMinorPieceVsKing(
    whitePieces: PieceWithCoords[],
    blackPieces: PieceWithCoords[]
  ): boolean {
    if (whitePieces.length === 1 && blackPieces.length === 2) {
      return blackPieces.some(
        (piece) =>
          piece.piece instanceof KnightPiece ||
          piece.piece instanceof BishopPiece
      );
    } else if (whitePieces.length === 2 && blackPieces.length === 1) {
      return whitePieces.some(
        (piece) =>
          piece.piece instanceof KnightPiece ||
          piece.piece instanceof BishopPiece
      );
    }
    return false;
  }

  // Caso: Ambos lados tienen un alfil del mismo color
  private isBothSidesBishopsOfSameColor(
    whitePieces: PieceWithCoords[],
    blackPieces: PieceWithCoords[]
  ): boolean {
    if (whitePieces.length === 2 && blackPieces.length === 2) {
      const whiteBishop = whitePieces.find(
        (piece) => piece.piece instanceof BishopPiece
      );
      const blackBishop = blackPieces.find(
        (piece) => piece.piece instanceof BishopPiece
      );

      if (whiteBishop && blackBishop) {
        const areBishopsOfSameColor: boolean =
          (ChessBoard.isSquareWhite(whiteBishop.x, whiteBishop.y) &&
            ChessBoard.isSquareWhite(blackBishop.x, blackBishop.y)) ||
          (!ChessBoard.isSquareWhite(whiteBishop.x, whiteBishop.y) &&
            !ChessBoard.isSquareWhite(blackBishop.x, blackBishop.y));

        return areBishopsOfSameColor;
      }
    }
    return false;
  }

  // Caso: Rey y dos caballos contra Rey
  private isKingAndTwoKnightsVsKing(
    whitePieces: { piece: Piece; x: number; y: number }[],
    blackPieces: { piece: Piece; x: number; y: number }[]
  ): boolean {
    return (
      (whitePieces.length === 3 &&
        blackPieces.length === 1 &&
        this.playerHasOnlyTwoKnightsAndKing(whitePieces)) ||
      (whitePieces.length === 1 &&
        blackPieces.length === 3 &&
        this.playerHasOnlyTwoKnightsAndKing(blackPieces))
    );
  }

  // Caso: Solo alfiles del mismo color y un rey contra Rey
  private isOnlyBishopsOfSameColorAndKing(
    whitePieces: { piece: Piece; x: number; y: number }[],
    blackPieces: { piece: Piece; x: number; y: number }[]
  ): boolean {
    return (
      (whitePieces.length >= 3 &&
        blackPieces.length === 1 &&
        this.playerHasOnlyBishopsWithSameColorAndKing(whitePieces)) ||
      (whitePieces.length === 1 &&
        blackPieces.length >= 3 &&
        this.playerHasOnlyBishopsWithSameColorAndKing(blackPieces))
    );
  }

  /**
   * Verifica si hay solo alfiles del mismo color y un rey en el tablero.
   *
   * @param pieces - Array de objetos que representan las piezas en el tablero, cada objeto tiene:
   *                 - `piece`: Una pieza del juego.
   *                 - `x`: Posición x en el tablero.
   *                 - `y`: Posición y en el tablero.
   * @returns `true` si solo hay alfiles del mismo color y un rey, `false` en caso contrario.
   */
  private playerHasOnlyBishopsWithSameColorAndKing(
    pieces: { piece: Piece; x: number; y: number }[]
  ): boolean {
    const bishops = pieces.filter(
      (piece) => piece.piece instanceof BishopPiece
    );
    const areAllBishopsOfSameColor =
      new Set(
        bishops.map((bishop) => !ChessBoard.isSquareWhite(bishop.x, bishop.y))
      ).size === 1;
    return bishops.length === pieces.length - 1 && areAllBishopsOfSameColor;
  }

  /**
   * Verifica si hay exactamente dos caballos en el tablero.
   *
   * @param pieces - Array de objetos que representan las piezas en el tablero, cada objeto tiene:
   *                 - `piece`: Una pieza del juego.
   *                 - `x`: Posición x en el tablero.
   *                 - `y`: Posición y en el tablero.
   * @returns `true` si hay exactamente dos caballos, `false` en caso contrario.
   */
  private playerHasOnlyTwoKnightsAndKing(
    pieces: { piece: Piece; x: number; y: number }[]
  ): boolean {
    return (
      pieces.filter((piece) => piece.piece instanceof KnightPiece).length === 2
    );
  }

  public restart() {
    this._chessBoard = this.defaultBoard();
  }

  public chessBoardView() {
    return this._chessBoard.map((row) => row.map((piece) => piece.symbol));
  }

  public removePiece(removedX: number, removedY: number) {
    this._chessBoard[removedX][removedY] = Piece.createEmpty();
  }
  public addOrMovePiece(updatedX: number, updatedY: number, piece: Piece) {
    this._chessBoard[updatedX][updatedY] = piece;
  }

  public get board() {
    return this._chessBoard;
  }

  public set board(updated: Piece[][]) {
    this._chessBoard = updated;
  }

  public static isSquareWhite(x: number, y: number): boolean {
    // Reverse row to match checkerboard notation
    const actualRow = BOARD_SIZE - x;
    // Determine if the sum of row and column is even or odd
    return (actualRow + y) % 2 === 0;
  }
}
