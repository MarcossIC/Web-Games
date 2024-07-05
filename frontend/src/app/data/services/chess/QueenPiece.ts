import { IPiece, Piece } from '@app/data/services/chess/Piece';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';

class QueenPiece extends Piece {
  constructor() {
    super();
    this.setWeight(929);
    this.setSymbol(PieceSymbol.BLACK_QUEEN);
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
    weight = 929,

    player = ChessPlayers.BLACK,
  }: Partial<IPiece>) {
    const queen = new QueenPiece();
    queen.setWeight(weight);
    queen.setPlayer(player);
    queen.setSymbol(
      player === ChessPlayers.WHITE
        ? PieceSymbol.WHITE_QUEEN
        : PieceSymbol.BLACK_QUEEN
    );
    return queen;
  }
}

export default QueenPiece;
