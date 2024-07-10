import { Type } from '@angular/core';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { Coords } from '@app/data/models/chess/chess-coords';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { BishopPieceComponent } from '@app/presentation/components/chess-pieces/bishop.component';
import { KnightPieceComponent } from '@app/presentation/components/chess-pieces/knight.component';
import { PawnPieceComponent } from '@app/presentation/components/chess-pieces/pawn.component';
import { KingPieceComponent } from '@app/presentation/components/chess-pieces/king.component';
import { RookPieceComponent } from '@app/presentation/components/chess-pieces/rook.component';
import { QueenPieceComponent } from '@app/presentation/components/chess-pieces/queen.component';
import PawnPiece from '@app/data/services/chess/PawnPiece';
import KingPiece from '@app/data/services/chess/KingPiece';
import RookPiece from '@app/data/services/chess/RookPiece';

export interface IPiece {
  weight: number;
  symbol: PieceSymbol;
  color: string;
  border: string;
  component: Type<any> | '';
  isMovable: boolean;
  pieceIsAlive: boolean;
  player: ChessPlayers;
}

export class Piece {
  private _weight: number;
  private _symbol: PieceSymbol;
  private _player: ChessPlayers;
  protected _directions: Coords[];

  public static readonly SYMBOL_TO_COMPONENT: Readonly<
    Record<PieceSymbol, Type<any> | null>
  > = {
    [PieceSymbol.WHITE_PAWN]: PawnPieceComponent,
    [PieceSymbol.WHITE_KNIGHT]: KnightPieceComponent,
    [PieceSymbol.WHITE_BISHOP]: BishopPieceComponent,
    [PieceSymbol.WHITE_ROOK]: RookPieceComponent,
    [PieceSymbol.WHITE_QUEEN]: QueenPieceComponent,
    [PieceSymbol.WHITE_KING]: KingPieceComponent,

    [PieceSymbol.BLACK_PAWN]: PawnPieceComponent,
    [PieceSymbol.BLACK_KNIGHT]: KnightPieceComponent,
    [PieceSymbol.BLACK_BISHOP]: BishopPieceComponent,
    [PieceSymbol.BLACK_ROOK]: RookPieceComponent,
    [PieceSymbol.BLACK_QUEEN]: QueenPieceComponent,
    [PieceSymbol.BLACK_KING]: KingPieceComponent,

    [PieceSymbol.UNKNOWN]: null,
  };

  constructor() {
    this._weight = 0;
    this._symbol = PieceSymbol.UNKNOWN;
    this._player = ChessPlayers.UNKNOWN;
    this._directions = [];
  }

  public isEmpty() {
    return this._symbol === PieceSymbol.UNKNOWN;
  }

  public isPieceMovable(currentTurn: ChessPlayers) {
    return !this.isEmpty() && this._player === currentTurn;
  }

  public static createEmpty() {
    const piece = new Piece();
    piece.setSymbol(PieceSymbol.UNKNOWN);
    return piece;
  }

  public static getPiecePlayer(piece: PieceSymbol) {
    if (piece === PieceSymbol.UNKNOWN) {
      return 'empty-piece';
    }
    return piece === piece.toUpperCase() ? 'white-piece' : 'black-piece';
  }

  public get weight(): number {
    return this._weight;
  }

  setWeight(weight: number): void {
    this._weight = weight;
  }

  public get symbol(): PieceSymbol {
    return this._symbol;
  }

  setSymbol(name: PieceSymbol): void {
    this._symbol = name;
  }

  public get player(): ChessPlayers {
    return this._player;
  }
  public setPlayer(updated: ChessPlayers): void {
    this._player = updated;
  }
  public get directions(): Coords[] {
    return this._directions;
  }
  public setDirections(updated: Coords[]): void {
    this._directions = updated;
  }
}
