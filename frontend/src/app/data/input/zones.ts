/** A box on the screen, in the coordinates the fingers come in. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export function contains(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

/** A place on the screen that a finger holds down: a key of a touch pad. */
export interface Zone<K extends string> {
  readonly key: K;
  readonly rect: Rect;
}

/** What heldZones needs from a finger: Phaser's pointers have it. */
export interface Finger {
  readonly isDown: boolean;
  readonly x: number;
  readonly y: number;
}

/**
 * Which zones are held, from where the fingers are now.
 *
 * It is read from scratch on every frame, with no memory of presses and
 * releases: a finger that slides from one zone to the next lets go of the
 * first at once, and a release never heard of (a finger lifted during a
 * pause, a touch the system cancelled) cannot leave a zone stuck. A finger
 * holds the first zone, in order, that has it. `out` is filled and
 * returned, so nothing is allocated per frame.
 */
export function heldZones<K extends string>(
  zones: readonly Zone<K>[] | null,
  fingers: readonly Finger[],
  out: Record<K, boolean>
): Record<K, boolean> {
  for (const key in out) out[key] = false;
  if (!zones) return out;

  for (let i = 0; i < fingers.length; i++) {
    const finger = fingers[i];
    if (!finger.isDown) continue;
    for (let j = 0; j < zones.length; j++) {
      if (contains(zones[j].rect, finger.x, finger.y)) {
        out[zones[j].key] = true;
        break;
      }
    }
  }
  return out;
}
