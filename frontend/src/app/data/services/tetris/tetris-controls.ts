import type { KeyBinding } from '@app-input';
import { ACTION } from '@app/data/models/tetris/MoveDirections.enum';

/**
 * Tetris's keys, by KeyboardEvent.key. Any other key is the empty action
 * (`null`, passed as the bindings' `otherwise`): it moves nothing, but it
 * still settles a piece that is resting on the stack.
 */
export const TETRIS_KEYS: readonly KeyBinding<ACTION>[] = [
  { action: ACTION.LEFT, keys: ['ArrowLeft', 'a'] },
  { action: ACTION.RIGHT, keys: ['ArrowRight', 'd'] },
  { action: ACTION.DOWN, keys: ['ArrowDown', 's'] },
  { action: ACTION.PAUSE, keys: ['p', 'Escape'] },
  { action: ACTION.ROTATE, keys: ['ArrowUp', 'w'] },
];

/** The widest screen the buttons under the board work on: a phone's. */
const SCREEN_BUTTONS_MAX_WIDTH = 500;

/** Whether the buttons under the board act, on a window this wide. */
export function screenButtonsOn(width: number): boolean {
  return width <= SCREEN_BUTTONS_MAX_WIDTH;
}
