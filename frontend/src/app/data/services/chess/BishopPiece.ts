import { IPiece, Piece } from '@app/data/services/chess/Piece';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';

class BishopPiece extends Piece {
  constructor() {
    super();
    this.setWeight(320);
    this.setSymbol(PieceSymbol.BLACK_BISHOP);
    this.setDirections([
      { x: 1, y: 1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: -1, y: -1 },
    ]);
  }

  public static createPiece({
    weight = 320,
    player = ChessPlayers.BLACK,
  }: Partial<IPiece>) {
    const bishop = new BishopPiece();
    bishop.setWeight(weight);
    bishop.setPlayer(player);

    bishop.setSymbol(
      player === ChessPlayers.WHITE
        ? PieceSymbol.WHITE_BISHOP
        : PieceSymbol.BLACK_BISHOP
    );

    return bishop;
  }
}

export default BishopPiece;
