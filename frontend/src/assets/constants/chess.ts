export const BOARD_ROW_SIZE = 8;

export const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

/**
 * How long the machine takes to answer at least: an instant reply reads
 * as a glitch. Short enough that a game against it never feels slow.
 */
export const CHESS_BOT_MIN_THINK_MS = 400;

export interface ChessModeInfo {
  id: 'practice' | 'machine';
  name: string;
  /** A few words on the mode's card. */
  tagline: string;
  /** The full rule, on the How to play page. */
  rule: string;
}

/** The modes, in the order the menu offers them. */
export const CHESS_MODES: readonly ChessModeInfo[] = [
  {
    id: 'practice',
    name: 'Practice',
    tagline: 'Move both sides',
    rule: 'You move both sides on this screen: to try ideas, or to play a friend.',
  },
  {
    id: 'machine',
    name: 'Machine',
    tagline: 'Play against the bot',
    rule: 'You take one side and the machine answers with the other, at the level you pick.',
  },
];

export interface ChessBotLevelInfo {
  id: 'rookie' | 'normal' | 'hard' | 'master';
  name: string;
  /** What to expect from it, under the level meter. */
  hint: string;
}

/** The machine's levels, weakest first. */
export const CHESS_BOT_LEVELS: readonly ChessBotLevelInfo[] = [
  {
    id: 'rookie',
    name: 'Rookie',
    hint: 'Still learning: it leaves pieces hanging and falls for simple tricks.',
  },
  {
    id: 'normal',
    name: 'Normal',
    hint: 'Sees your next move coming, but slips now and then.',
  },
  {
    id: 'hard',
    name: 'Hard',
    hint: 'Looks several moves ahead and punishes every loose piece.',
  },
  {
    id: 'master',
    name: 'Master',
    hint: 'Thinks before each move and gives nothing away.',
  },
];

export interface ChessSideInfo {
  id: 'white' | 'black' | 'random';
  name: string;
}

/** The sides the player can ask for against the machine. White moves first. */
export const CHESS_SIDES: readonly ChessSideInfo[] = [
  { id: 'white', name: 'White' },
  { id: 'random', name: 'Random' },
  { id: 'black', name: 'Black' },
];
