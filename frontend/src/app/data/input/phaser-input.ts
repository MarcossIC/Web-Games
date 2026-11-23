import type * as Phaser from 'phaser';
import type { ActionSource } from './action-source';
import { type BindOptions, bindKeys, type KeyBinding, type KeyLike } from './key-bindings';

/**
 * The Phaser adapter. It only names Phaser's types: its events are strings
 * ('down', 'keydown', 'keyup'), so neither the core nor the Angular bundle
 * pulls Phaser in through here.
 */

type Keyboard = Phaser.Input.Keyboard.KeyboardPlugin | null | undefined;

/** Held actions from Phaser keys, plus each key press with its event. */
export interface HeldKeys<A> extends ActionSource<A> {
  /**
   * Hears the press of an action's keys: once per press, with the event
   * that started it (Phaser's Key emits `down` once, not on the repeats).
   * A key still held from before arrives as a repeat (`event.repeat`).
   */
  onPress(action: A, handler: (event: KeyLike) => void): void;
}

/**
 * Phaser Keys for the `keyCodes` of the bindings (addKey, which also stops
 * the browser from scrolling with them, as `addKeys` did). Read every frame
 * with isDown. Phaser lets go of them when the game loses the focus and
 * when the scene pauses or sleeps, and drops them when it shuts down.
 */
export function heldKeys<A>(keyboard: Keyboard, bindings: readonly KeyBinding<A>[]): HeldKeys<A> {
  const keysOf = new Map<A, Phaser.Input.Keyboard.Key[]>();
  for (const binding of bindings) {
    if (!binding.keyCodes) throw new Error(`heldKeys needs keyCodes for ${String(binding.action)}`);
    const keys = keysOf.get(binding.action) ?? [];
    if (keyboard) for (const code of binding.keyCodes) keys.push(keyboard.addKey(code));
    keysOf.set(binding.action, keys);
  }
  return {
    isDown(action) {
      const keys = keysOf.get(action);
      if (!keys) return false;
      for (const key of keys) {
        if (key.isDown) return true;
      }
      return false;
    },
    onPress(action, handler) {
      for (const key of keysOf.get(action) ?? []) {
        key.on('down', (_key: Phaser.Input.Keyboard.Key, event: KeyboardEvent) => handler(event));
      }
    },
  };
}

/**
 * Key presses on a scene's keyboard as actions, with the event they came
 * from (Shift, repeat, timeStamp). Keys Phaser holds as Key objects reach
 * here once per press; any other key also with its repeats, which a
 * binding drops with `ignoreRepeat`. Returns the function that stops it.
 */
export function keyPresses<A>(
  keyboard: Keyboard,
  bindings: readonly KeyBinding<A>[],
  onDown: (action: A, event: KeyLike) => void,
  onUp?: (action: A, event: KeyLike) => void,
  options: BindOptions<A> = {}
): () => void {
  if (!keyboard) return () => {};
  const resolve = bindKeys(bindings, options);
  const down = (event: KeyboardEvent) => {
    const action = resolve(event);
    if (action !== undefined) onDown(action, event);
  };
  const up = (event: KeyboardEvent) => {
    const action = resolve(event);
    if (action !== undefined) onUp?.(action, event);
  };
  keyboard.on('keydown', down);
  if (onUp) keyboard.on('keyup', up);
  return () => {
    keyboard.off('keydown', down);
    if (onUp) keyboard.off('keyup', up);
  };
}
