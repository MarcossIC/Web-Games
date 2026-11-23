import type { Direction, KeyBinding } from '@app-input';
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

/**
 * What each step of a finger dragged over the board asks for. Up does
 * nothing: rotating is a tap.
 */
export const TETRIS_DRAGS: Readonly<Record<Direction, ACTION | null>> = {
  left: ACTION.LEFT,
  right: ACTION.RIGHT,
  down: ACTION.DOWN,
  up: null,
};

/** The widest screen the page lays out for a phone (the CSS's max-width: 500px). */
const PHONE_MAX_WIDTH = 500;

/** Whether a window this wide gets the phone layout: the board stretched to fill it. */
export function phoneLayout(width: number): boolean {
  return width <= PHONE_MAX_WIDTH;
}
