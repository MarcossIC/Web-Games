/**
 * Something that holds actions down: the keyboard, the keys on a touch
 * screen and, one day, a stick on the screen, a gamepad or the tilt of the
 * phone. A game reads its actions from here every frame and never asks
 * which device holds them.
 */
export interface ActionSource<A> {
  isDown(action: A): boolean;
}

/** Several sources as one: an action is down while any of them holds it. */
export function anyDown<A>(...sources: readonly ActionSource<A>[]): ActionSource<A> {
  return {
    isDown(action) {
      for (const source of sources) {
        if (source.isDown(action)) return true;
      }
      return false;
    },
  };
}
