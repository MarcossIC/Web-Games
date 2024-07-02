import { IPiece, Piece } from '@app/data/models/chess/Piece';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';

class KnightPiece extends Piece {
  constructor() {
    super();
    this.setIsMovable(true);
    this.setPieceIsAlive(true);
    this.setWeight(280);
    this.setSymbol(PieceSymbol.BLACK_KNIGHT);
    this.setDirections([
      { x: 1, y: 2 },
      { x: 1, y: -2 },
      { x: -1, y: 2 },
      { x: -1, y: -2 },
      { x: 2, y: 1 },
      { x: 2, y: -1 },
      { x: -2, y: 1 },
      { x: -2, y: -1 },
    ]);
  }

  public static createPiece({
    isMovable = true,
    pieceIsAlive = true,
    weight = 280,
    player = ChessPlayers.BLACK,
  }: Partial<IPiece>) {
    const knight = new KnightPiece();
    knight.setIsMovable(isMovable);
    knight.setPieceIsAlive(pieceIsAlive);
    knight.setWeight(weight);
    knight.setPlayer(player);
    knight.setSymbol(
      player === ChessPlayers.WHITE
        ? PieceSymbol.WHITE_KNIGHT
        : PieceSymbol.BLACK_KNIGHT
    );
    return knight;
  }
}

export default KnightPiece;
