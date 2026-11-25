import type { Finger } from './zones';

/**
 * A finger that also says where it went down: Phaser's pointers have it
 * (`downX`, `downY`), in the same coordinates as `x` and `y`.
 */
export interface StickFinger extends Finger {
  readonly downX: number;
  readonly downY: number;
}

/** Where the stick is pushed, from where its finger went down. */
export interface StickPush {
  /** How far the finger went from where it landed, unbounded. */
  dx: number;
  dy: number;
  /** The knob, held within `radius` of where the finger landed. */
  knobX: number;
  knobY: number;
}

export function idleStickPush(): StickPush {
  return { dx: 0, dy: 0, knobX: 0, knobY: 0 };
}

/**
 * A stick that floats: it is centred wherever the finger lands, so a thumb
 * never has to find it, and pushed by how far the finger slides from there.
 * Read from scratch every frame like `heldZones`, with no memory: a finger
 * lifted unheard cannot leave the stick pushed. `out` is filled and returned.
 */
export function stickPush(finger: StickFinger, radius: number, out: StickPush): StickPush {
  const dx = finger.x - finger.downX;
  const dy = finger.y - finger.downY;
  const distance = Math.hypot(dx, dy);
  const scale = distance > radius ? radius / distance : 1;
  out.dx = dx;
  out.dy = dy;
  out.knobX = finger.downX + dx * scale;
  out.knobY = finger.downY + dy * scale;
  return out;
}
