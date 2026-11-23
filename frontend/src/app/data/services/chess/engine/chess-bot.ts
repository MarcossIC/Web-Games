import { Position, moveFrom, movePromotion, moveTo } from './position';
import { SEARCH_ROOM, Search, SearchLimits } from './search';

/**
 * How the machine picks its move. Plain TypeScript: it knows the moves
 * played and the level, nothing about Angular or the game's services.
 *
 * Every level runs the same search. What sets them apart is how far ahead
 * it looks, how long it thinks, and how often it settles for a move that
 * is not the best it saw.
 */

export type ChessBotLevel = 'rookie' | 'normal' | 'hard' | 'master';

/** A move by its squares (`row * 8 + column`, row 0 on black's side). */
export interface BotMove {
  from: number;
  to: number;
  /** What a pawn becomes on the last row: 2 knight, 3 bishop, 4 rook, 5 queen. 0 otherwise. */
  promotion: number;
}

/** What the page asks the worker: the game so far and who answers it. */
export interface BotRequest {
  /** Comes back with the answer, to tell it from the answer to an older question. */
  id: number;
  /** Every move of the game, from the starting position. */
  moves: BotMove[];
  level: ChessBotLevel;
}

export interface BotReply {
  id: number;
  /** null: the moves were not a game of chess, or the game is over. */
  move: BotMove | null;
}

export interface ChessBotProfile {
  /** How many moves ahead it looks at most, counting both sides'. */
  depth: number;
  /** How long it may think. */
  timeMs: number;
  /** Plays any move this close to the best it found, in hundredths of a pawn. */
  margin: number;
  /** Chance of a careless move. Rolled again on each move. */
  slipChance: number;
  /** How much a careless move may give away, as far as it can see. */
  slipMargin: number;
}

/**
 * Rookie sees its own move and what can be taken right after, and one
 * move in three it does not even look that carefully: it hangs pieces and
 * walks into forks. Normal sees the reply to its move and slips now and
 * then. Hard looks four moves ahead and does not slip. Master thinks for
 * as long as it is given, as deep as that takes it.
 */
export const CHESS_BOT_PROFILES: Record<ChessBotLevel, ChessBotProfile> = {
  rookie: { depth: 1, timeMs: 300, margin: 40, slipChance: 0.35, slipMargin: 400 },
  normal: { depth: 2, timeMs: 500, margin: 25, slipChance: 0.12, slipMargin: 200 },
  hard: { depth: 4, timeMs: 1000, margin: 10, slipChance: 0, slipMargin: 0 },
  master: { depth: 40, timeMs: 1500, margin: 0, slipChance: 0, slipMargin: 0 },
};

/** The first moves of a game, where every level varies what it plays. */
const OPENING_PLIES = 10;
/** Without this the best levels would open every game the same way. */
const OPENING_MARGIN = 12;

/**
 * The position after `moves` from the start of a game, with room to be
 * searched. null when one of them is not a legal move.
 */
export function positionAfter(moves: readonly BotMove[]): Position | null {
  const position = new Position(moves.length + SEARCH_ROOM);
  for (const { from, to, promotion } of moves) {
    const move = position.findMove(from, to, promotion);
    if (move === 0) return null;
    position.make(move);
  }
  return position;
}

/**
 * The move the machine plays, or null when it has none: the game is over.
 * `random` gives numbers in [0, 1) like Math.random; tests pass their own
 * to make a level's rolls certain. `limits` replaces the profile's own.
 */
export function chooseBotMove(
  position: Position,
  profile: ChessBotProfile,
  search: Search = new Search(),
  random: () => number = Math.random,
  limits: Partial<SearchLimits> = {}
): BotMove | null {
  const slips = random() < profile.slipChance;
  const opening = position.ply < OPENING_PLIES ? OPENING_MARGIN : 0;
  const margin = slips ? profile.slipMargin : Math.max(profile.margin, opening);

  const { moves } = search.run(position, {
    depth: profile.depth,
    timeMs: profile.timeMs,
    margin,
    ...limits,
  });
  if (moves.length === 0) return null;

  const { move } = moves[Math.floor(random() * moves.length)];
  return { from: moveFrom(move), to: moveTo(move), promotion: movePromotion(move) };
}

/** Answers a request. One `search` kept between moves remembers what it learned. */
export function answerBotRequest(
  request: BotRequest,
  search: Search = new Search(),
  random: () => number = Math.random
): BotReply {
  const position = positionAfter(request.moves);
  const move = position
    ? chooseBotMove(position, CHESS_BOT_PROFILES[request.level], search, random)
    : null;
  return { id: request.id, move };
}
