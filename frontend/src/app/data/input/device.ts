/** What startsAsTouch needs from window: only matchMedia. */
export interface MediaHost {
  matchMedia?: (query: string) => { matches: boolean };
}

/**
 * The device a scene assumes before its first press. On a phone the dialog's
 * Play button takes the first tap, so the canvas has not seen a finger yet:
 * without this the hints would say CLICK OR SPACE until the next tap.
 * Same query as the page's CSS for touch screens.
 */
export function startsAsTouch(host: MediaHost | undefined): boolean {
  try {
    return host?.matchMedia?.('(pointer: coarse)').matches ?? false;
  } catch {
    return false;
  }
}

/**
 * A mouse or trackpad is attached (any of the pointers is fine). The mouse
 * lock (CanvasPointerLock) is only asked for then: a phone has nothing to
 * lock, and its fingers never go through the locked steering anyway.
 */
export function hasMouse(host: MediaHost | undefined): boolean {
  try {
    return host?.matchMedia?.('(any-pointer: fine)').matches ?? false;
  } catch {
    return false;
  }
}
