import type { KeyBinding } from '@app-input';

export type TicTacToeAction = 'reset';

/**
 * Tic-Tac-Toe's keys, by KeyboardEvent.key: the cells are picked with a
 * click. P and Esc restart the game here (there is no pause).
 */
export const TICTACTOE_KEYS: readonly KeyBinding<TicTacToeAction>[] = [{ action: 'reset', keys: ['p', 'Escape'] }];
