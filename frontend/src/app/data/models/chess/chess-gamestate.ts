import { LastMove } from '@app/data/models/chess/chess-lastmove';
import { ChessPlayers } from '@app/data/models/chess/chess-players';

export interface ChessGameState {
  lastMove: LastMove | undefined;
  isInCheck: boolean;
  currentPlayer: ChessPlayers;
}
