/**
 * What a binding reads from a key press: a DOM KeyboardEvent has it all, and
 * so does the event Phaser hands over. Everything is optional, so a test or
 * an adapter passes only what it has.
 */
export interface KeyLike {
  /** The character or name the layout gives the key: 'a', 'A', 'ArrowLeft', 'Escape'. */
  readonly key?: string;
  /** The place of the key, whatever the layout: 'KeyA', 'Space', 'ShiftLeft'. */
  readonly code?: string;
  /** The legacy number of the layout's letter: what Phaser's `keydown-P` and `addKey` match. */
  readonly keyCode?: number;
  /** The key is held and the system is repeating it. */
  readonly repeat?: boolean;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
  readonly timeStamp?: number;
}

/**
 * Which keys ask for an action. A key matches by any of `keys`, `codes` or
 * `keyCodes`; each game picks the one it has always used, so nothing moves
 * on a layout that is not QWERTY.
 */
export interface KeyBinding<A> {
  readonly action: A;
  /** KeyboardEvent.key values. */
  readonly keys?: readonly string[];
  /** KeyboardEvent.code values. */
  readonly codes?: readonly string[];
  /** KeyboardEvent.keyCode values. */
  readonly keyCodes?: readonly number[];
  /** `keys` match whatever the case (Caps Lock, Shift). */
  readonly ignoreCase?: boolean;
  /** A held key's repeats do not count: one action per press. */
  readonly ignoreRepeat?: boolean;
  /** With Ctrl, Cmd or Alt held the key is the browser's (Ctrl+P prints), not the game's. Shift still counts. */
  readonly ignoreModifiers?: boolean;
}

export interface BindOptions<A> {
  /** The action of a key no binding takes. Without it such a key gives undefined. */
  readonly otherwise?: A;
}

/** Which action a key press asks for. */
export type KeyResolver<A> = (event: KeyLike) => A | undefined;

function matches<A>(binding: KeyBinding<A>, event: KeyLike): boolean {
  if (binding.ignoreRepeat && event.repeat) return false;
  if (binding.ignoreModifiers && (event.ctrlKey || event.metaKey || event.altKey)) return false;
  const { key, code, keyCode } = event;
  if (key !== undefined && binding.keys) {
    const wanted = binding.ignoreCase ? key.toLowerCase() : key;
    for (const bound of binding.keys) {
      if ((binding.ignoreCase ? bound.toLowerCase() : bound) === wanted) return true;
    }
  }
  if (code !== undefined && binding.codes?.includes(code)) return true;
  if (keyCode !== undefined && binding.keyCodes?.includes(keyCode)) return true;
  return false;
}

/**
 * A game's key table as a function: key press in, action out. The first
 * binding that takes the key wins.
 */
export function bindKeys<A>(bindings: readonly KeyBinding<A>[], options: BindOptions<A> = {}): KeyResolver<A> {
  const hasFallback = 'otherwise' in options;
  return (event) => {
    for (const binding of bindings) {
      if (matches(binding, event)) return binding.action;
    }
    return hasFallback ? options.otherwise : undefined;
  };
}
