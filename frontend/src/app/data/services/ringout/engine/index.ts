/**
 * The rules of Ring Out, plain TypeScript: no Angular and no canvas. The
 * page draws the board and moves the pieces; this decides what they may do.
 */
export * from './types';
export * from './config';
export {
  Board,
  type BoardEvent,
  type Bounds,
  type Clip,
  type Piece,
  type Ring,
  type Rod,
  type SlidePlan,
  type TurnOutcome,
  type TurnRange,
} from './board';
export { LEVELS } from './levels';
export { levelProblems } from './validate';
export { autoplay, nextMove, playMove, progressMoves } from './solver';
export { type Vec, TAU } from './geometry';
