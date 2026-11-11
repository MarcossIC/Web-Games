import { ChunkDraft } from '../chunk-draft';

export interface PatternResult {
  /** The height the chunk ends at. */
  exitY: number;
  /** A cost of its own; without it, the pattern cost plus its stones. */
  cost?: number;
}

/**
 * A pattern lays its pieces from the draft's cursor and leaves the cursor
 * on the end tile of its last floor.
 */
export type PatternPlanner = (draft: ChunkDraft) => PatternResult;

export const STEP_HEIGHT = 25;
