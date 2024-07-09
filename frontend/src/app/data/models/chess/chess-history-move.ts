import { CheckState } from '@app/data/models/chess/chess-checkstate';
import { LastMove } from '@app/data/models/chess/chess-lastmove';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';

export type GameHistory = {
  lastMove: LastMove | undefined;
  checkState: CheckState;
  board: PieceSymbol[][];
};

export type MoveList = [string, string?][];
