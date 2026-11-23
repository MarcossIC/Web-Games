import { BotLevel } from '@app/data/models/tictactoe/BotLevel.enum';

/**
 * How the bot picks a cell. Plain TypeScript: it knows the board and the
 * level, nothing about Angular or the game's services.
 */

export type Mark = 'X' | 'O';

/** The nine cells row by row; '0' is an empty one, as on the game's board. */
export type Cells = readonly string[];

/** What a level sees. Every chance is rolled again on each move. */
export interface BotProfile {
  /** Chance of taking a win that is one move away. */
  takesWin: number;
  /** Chance of blocking a loss that is one move away. */
  blocks: number;
  /** Chance of finding the best move when it took neither; a random cell otherwise. */
  thinks: number;
  /** Between equally good moves, takes the one a rival most likely falls for. */
  setsTraps: boolean;
}

/**
 * Rookie misses things in plain sight, Normal only loses to a fork it did
 * not see coming, Master never loses and plays for the rival's mistake.
 */
export const BOT_PROFILES: Record<BotLevel, BotProfile> = {
  [BotLevel.ROCKIE]: { takesWin: 0.85, blocks: 0.5, thinks: 0.1, setsTraps: false },
  [BotLevel.NOVICE]: { takesWin: 1, blocks: 1, thinks: 0.6, setsTraps: false },
  [BotLevel.MASTER]: { takesWin: 1, blocks: 1, thinks: 1, setsTraps: true },
};

const EMPTY = '0';

const LINES: readonly (readonly number[])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function winnerOf(cells: Cells): Mark | null {
  for (const [a, b, c] of LINES) {
    if (cells[a] !== EMPTY && cells[a] === cells[b] && cells[a] === cells[c]) {
      return cells[a] as Mark;
    }
  }
  return null;
}

export function emptyCells(cells: Cells): number[] {
  const empty: number[] = [];
  cells.forEach((cell, index) => cell === EMPTY && empty.push(index));
  return empty;
}

function rivalOf(mark: Mark): Mark {
  return mark === 'X' ? 'O' : 'X';
}

function place(cells: Cells, cell: number, mark: Mark): Cells {
  const next = cells.slice();
  next[cell] = mark;
  return next;
}

/** The cells where `mark` completes a line right now. */
function winningCells(cells: Cells, mark: Mark): number[] {
  return emptyCells(cells).filter((cell) => winnerOf(place(cells, cell, mark)) === mark);
}

/** A board has few positions and each is reached many ways, so they are solved once. */
const solved = new Map<string, number>();

/**
 * What the position is worth to `toMove` when both play their best:
 * above zero wins, zero draws, below zero loses. A result that comes
 * sooner weighs more, so the bot wins fast and loses as late as it can.
 */
function solve(cells: Cells, toMove: Mark): number {
  const key = cells.join('') + toMove;
  const known = solved.get(key);
  if (known !== undefined) return known;

  const empty = emptyCells(cells);
  let value: number;
  if (winnerOf(cells)) {
    // Only who just moved can have completed a line.
    value = -(empty.length + 1);
  } else if (empty.length === 0) {
    value = 0;
  } else {
    const rival = rivalOf(toMove);
    value = Math.max(...empty.map((cell) => -solve(place(cells, cell, toMove), rival)));
  }
  solved.set(key, value);
  return value;
}

/** Every move that keeps the best result `mark` can still force. */
export function bestMoves(cells: Cells, mark: Mark): number[] {
  const rival = rivalOf(mark);
  let best = -Infinity;
  let moves: number[] = [];
  for (const cell of emptyCells(cells)) {
    const value = -solve(place(cells, cell, mark), rival);
    if (value > best) {
      best = value;
      moves = [cell];
    } else if (value === best) {
      moves.push(cell);
    }
  }
  return moves;
}

const trapped = new Map<string, number>();

/**
 * How likely `bot` ends up winning from here against a casual rival: one
 * who takes a win, blocks a line about to be completed and otherwise plays
 * anywhere. Against a perfect rival every drawn move is the same; this is
 * what tells apart the one that leaves a fork for the rival to walk into.
 */
function trapOdds(cells: Cells, bot: Mark, toMove: Mark): number {
  const key = cells.join('') + bot + toMove;
  const known = trapped.get(key);
  if (known !== undefined) return known;

  const winner = winnerOf(cells);
  const empty = emptyCells(cells);
  const rival = rivalOf(bot);
  let odds: number;
  if (winner || empty.length === 0) {
    odds = winner === bot ? 1 : 0;
  } else if (toMove === bot) {
    odds = Math.max(
      ...bestMoves(cells, bot).map((cell) => trapOdds(place(cells, cell, bot), bot, rival))
    );
  } else if (winningCells(cells, rival).length > 0) {
    odds = 0;
  } else {
    const blocks = winningCells(cells, bot);
    const replies = blocks.length > 0 ? blocks : empty;
    odds =
      replies.reduce((sum, cell) => sum + trapOdds(place(cells, cell, rival), bot, bot), 0) /
      replies.length;
  }
  trapped.set(key, odds);
  return odds;
}

/** The best moves that leave the rival the most chances to go wrong. */
function trickiestMoves(cells: Cells, mark: Mark): number[] {
  const rival = rivalOf(mark);
  const rated = bestMoves(cells, mark).map((cell) => ({
    cell,
    odds: trapOdds(place(cells, cell, mark), mark, rival),
  }));
  const top = Math.max(...rated.map((move) => move.odds));
  // The odds are sums of fractions: equal ones can differ by a rounding error.
  return rated.filter((move) => top - move.odds < 1e-9).map((move) => move.cell);
}

/**
 * The cell the bot marks. `random` gives numbers in [0, 1) like
 * Math.random; tests pass their own to make a level's rolls certain.
 */
export function chooseBotMove(
  cells: Cells,
  mark: Mark,
  profile: BotProfile,
  random: () => number = Math.random
): number {
  const pick = (options: number[]) => options[Math.floor(random() * options.length)];

  const wins = winningCells(cells, mark);
  if (wins.length > 0 && random() < profile.takesWin) return pick(wins);

  const blocks = winningCells(cells, rivalOf(mark));
  if (blocks.length > 0 && random() < profile.blocks) return pick(blocks);

  if (random() < profile.thinks) {
    return pick(profile.setsTraps ? trickiestMoves(cells, mark) : bestMoves(cells, mark));
  }
  return pick(emptyCells(cells));
}
