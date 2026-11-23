import { PieceSymbol } from '@app/data/models/chess/piece-symbols';

export type { ChessBotLevel } from '@app/data/services/chess/engine/chess-bot';

/**
 * The ways to play Chess.
 * - practice: both sides are moved on this screen, by one player or two.
 * - machine: the player has one side and the machine answers with the other.
 */
export type ChessMode = 'practice' | 'machine';

/** The side the player asks for against the machine. */
export type ChessSide = 'white' | 'black' | 'random';

/** A move as it was asked for, enough to play it again. */
export interface PlayedMove {
  prevX: number;
  prevY: number;
  newX: number;
  newY: number;
  /** What a pawn becomes on the last row; UNKNOWN or null when it does not promote. */
  promotedPieceType: PieceSymbol | null;
}
