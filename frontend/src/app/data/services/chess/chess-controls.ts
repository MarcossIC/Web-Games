import type { KeyBinding } from '@app-input';

/** Through the game's history (next, previous), take back a move, or pause. */
export type ChessAction = 'next' | 'previous' | 'undo' | 'pause';

/** Chess's keys, by KeyboardEvent.key: the pieces are moved with the pointer. */
export const CHESS_KEYS: readonly KeyBinding<ChessAction>[] = [
  { action: 'next', keys: ['ArrowRight'] },
  { action: 'previous', keys: ['ArrowLeft'] },
  { action: 'undo', keys: ['u'] },
  { action: 'pause', keys: ['p', 'Escape'] },
];
