import { IPiece, Piece } from '@app/data/services/chess/Piece';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';

class RookPiece extends Piece {
  private _hasMoved: boolean;

  constructor() {
    super();
    this._hasMoved = false;
    this.setWeight(479);
    this.setSymbol(PieceSymbol.BLACK_ROOK);
    this.setDirections([
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]);
  }

  public static createPiece({
    weight = 479,
    player = ChessPlayers.BLACK,
  }: Partial<IPiece>) {
    const rook = new RookPiece();
    rook.setWeight(weight);
    rook.setPlayer(player);
    rook.setSymbol(
      player === ChessPlayers.WHITE
        ? PieceSymbol.WHITE_ROOK
        : PieceSymbol.BLACK_ROOK
    );
    return rook;
  }

  public get hasMoved(): boolean {
    return this._hasMoved;
  }

  public updateMoved() {
    this._hasMoved = true;
  }
}

export default RookPiece;
