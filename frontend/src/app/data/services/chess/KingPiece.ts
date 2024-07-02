import { IPiece, Piece } from '@app/data/models/chess/Piece';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';

class KingPiece extends Piece {
  private _hasMoved: boolean;

  constructor() {
    super();
    this._hasMoved = false;
    this.setIsMovable(false);
    this.setPieceIsAlive(true);
    this.setWeight(60000);
    this.setSymbol(PieceSymbol.BLACK_KING);
    this.setDirections([
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 0 },
      { x: -1, y: 1 },
      { x: -1, y: -1 },
    ]);
  }

  public static createPiece({
    isMovable = false,
    pieceIsAlive = true,
    weight = 60000,
    player = ChessPlayers.BLACK,
  }: Partial<IPiece>) {
    const king = new KingPiece();
    king.setIsMovable(isMovable);
    king.setPieceIsAlive(pieceIsAlive);
    king.setWeight(weight);
    king.setPlayer(player);
    king.setSymbol(
      player === ChessPlayers.WHITE
        ? PieceSymbol.WHITE_KING
        : PieceSymbol.BLACK_KING
    );
    return king;
  }

  public get hasMoved(): boolean {
    return this._hasMoved;
  }

  public updateMoved() {
    this._hasMoved = true;
  }
}

export default KingPiece;
