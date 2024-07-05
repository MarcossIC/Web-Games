import { IPiece, Piece } from '@app/data/services/chess/Piece';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';

class PawnPiece extends Piece {
  private _hasMoved: boolean;
  private static readonly PAWN_DIRECTION_BEFORE_MOVE = [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 1, y: 1 },
    { x: 1, y: -1 },
  ];
  private static readonly PAWN_DIRECTION_AFTER_MOVE = [
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 1, y: -1 },
  ];

  constructor() {
    super();
    this._hasMoved = false;
    this.setWeight(100);
    this.setSymbol(PieceSymbol.BLACK_PAWN);
    this.setDirections(PawnPiece.PAWN_DIRECTION_BEFORE_MOVE);
    if (this.player === ChessPlayers.WHITE) this.setWhitePawnDirections();
  }

  public static createPiece({
    weight = 100,
    player = ChessPlayers.BLACK,
  }: Partial<IPiece>) {
    const pawn = new PawnPiece();
    pawn.setWeight(weight);
    pawn.setPlayer(player);
    pawn.setSymbol(
      player === ChessPlayers.WHITE
        ? PieceSymbol.WHITE_PAWN
        : PieceSymbol.BLACK_PAWN
    );
    pawn.setDirections(PawnPiece.PAWN_DIRECTION_BEFORE_MOVE);
    if (pawn.player === ChessPlayers.WHITE) pawn.setWhitePawnDirections();
    return pawn;
  }

  public get hasMoved(): boolean {
    return this._hasMoved;
  }

  private setWhitePawnDirections(): void {
    this.setDirections(this._directions.map(({ x, y }) => ({ x: -1 * x, y })));
  }
  public updateMoved() {
    this._hasMoved = true;
    this.setDirections(PawnPiece.PAWN_DIRECTION_AFTER_MOVE);
    if (this.player === ChessPlayers.WHITE) this.setWhitePawnDirections();
  }
}

export default PawnPiece;
