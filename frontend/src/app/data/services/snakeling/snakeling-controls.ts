import type { Direction, KeyBinding } from '@app-input';

/** What the player asks of the snake: a way to turn, or the pause. */
export type SnakelingAction = Direction | 'pause';

/** Snakeling's keys, by KeyboardEvent.key. */
export const SNAKELING_KEYS: readonly KeyBinding<SnakelingAction>[] = [
  { action: 'left', keys: ['ArrowLeft', 'a'] },
  { action: 'right', keys: ['ArrowRight', 'd'] },
  { action: 'down', keys: ['ArrowDown', 's'] },
  { action: 'pause', keys: ['p', 'Escape'] },
  { action: 'up', keys: ['ArrowUp', 'w'] },
];

/** At most one key press this often, any key: a held key does not flood the turns. */
export const KEY_THROTTLE_MS = 90;
