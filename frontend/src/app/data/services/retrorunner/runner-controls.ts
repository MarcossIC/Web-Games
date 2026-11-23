import { KEY_CODES, type KeyBinding } from '@app-input';

/** What the capybara is asked for while a key, or a finger on the pad, stays down. */
export type RunnerHeldAction = 'left' | 'right' | 'jump' | 'crouch' | 'restart';

/**
 * The keys of the run, read every frame. By keyCode: Phaser makes a Key
 * for each (which also keeps the arrows and Space from scrolling the page).
 * R restarts once held for a while (HoldToConfirm).
 */
export const RUN_HELD_KEYS: readonly KeyBinding<RunnerHeldAction>[] = [
  { action: 'left', keyCodes: [KEY_CODES.LEFT, KEY_CODES.A] },
  { action: 'right', keyCodes: [KEY_CODES.RIGHT, KEY_CODES.D] },
  { action: 'jump', keyCodes: [KEY_CODES.UP, KEY_CODES.W, KEY_CODES.SPACE] },
  { action: 'crouch', keyCodes: [KEY_CODES.DOWN, KEY_CODES.S] },
  { action: 'restart', keyCodes: [KEY_CODES.R] },
];

/**
 * Pause during the run: Esc or P, by the letter of the layout, once per
 * press, or holding P would pause and resume over and over. While paused
 * the run hears nothing: the pause screen reads PAUSE_SCREEN_KEYS.
 */
export const RUN_PAUSE_KEYS: readonly KeyBinding<'pause'>[] = [
  { action: 'pause', keyCodes: [KEY_CODES.P, KEY_CODES.ESC], ignoreRepeat: true },
];

/**
 * Back to the run from the pause screen: Esc or P by their place on the
 * keyboard. A key held since before the pause repeats: only a new press
 * resumes.
 */
export const PAUSE_SCREEN_KEYS: readonly KeyBinding<'resume'>[] = [
  { action: 'resume', codes: ['Escape', 'KeyP'], ignoreRepeat: true },
];

/** R held on the pause screen restarts, as during the run. */
export const PAUSE_SCREEN_HELD_KEYS: readonly KeyBinding<'restart'>[] = [{ action: 'restart', keyCodes: [KEY_CODES.R] }];

/**
 * Space on the game over screen: a new run, or the same seed with Shift.
 * Repeats and Shift come through: retryChoice reads them off the event.
 */
export const GAME_OVER_KEYS: readonly KeyBinding<'retry'>[] = [{ action: 'retry', keyCodes: [KEY_CODES.SPACE] }];
