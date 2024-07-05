import { Piece } from '@app/data/services/chess/Piece';

export enum MoveType {
  Capture,
  Castling,
  Promotion,
  Check,
  CheckMate,
  BasicMove,
}

export type LastMove = {
  piece: Piece;
  prevX: number;
  prevY: number;
  currX: number;
  currY: number;
  moveType: Set<MoveType>;
};
