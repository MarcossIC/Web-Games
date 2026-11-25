import type { KeyBinding } from '@app-input';

/** What the keyboard asks of Ring Out: the pieces themselves are turned with the pointer. */
export type RingOutAction = 'pause' | 'retry' | 'hint';

/** Ring Out's keys, by KeyboardEvent.key. */
export const RINGOUT_KEYS: readonly KeyBinding<RingOutAction>[] = [
  { action: 'pause', keys: ['p', 'Escape'], ignoreCase: true, ignoreModifiers: true },
  { action: 'retry', keys: ['r'], ignoreCase: true, ignoreRepeat: true, ignoreModifiers: true },
  { action: 'hint', keys: ['h'], ignoreCase: true, ignoreRepeat: true, ignoreModifiers: true },
];
