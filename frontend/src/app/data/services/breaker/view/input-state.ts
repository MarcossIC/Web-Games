import type { BreakerInput } from '../engine/types';

/** What a key does in the game; the Phaser side maps key codes onto these. */
export type InputAction = 'left' | 'right' | 'fire' | 'overdrive';

/** A touch shorter and stiller than this is a tap (launch); anything else is a drag (steer). */
export const TAP = { MAX_MS: 280, MAX_MOVE: 14 } as const;

/**
 * Under pointer lock the cursor stands still and only its motion (dx, in
 * world px) arrives: the steering target walks from where it was and stops
 * at the paddle's reach [min, max], so turning back answers at once instead
 * of first winding back motion spent past a wall.
 */
export function lockedTargetX(from: number, dx: number, min: number, max: number): number {
  const x = Number.isFinite(dx) ? from + dx : from;
  return Math.max(min, Math.min(max, x));
}

/**
 * Turns raw key and pointer facts into one `BreakerInput` per frame.
 * Pure (no Phaser, no DOM): the InputController feeds it events, the scene
 * samples it once per frame. The sampled object is reused.
 *
 * Steering: the pointer steers until a steering key is pressed; then the
 * keyboard steers until the mouse really moves again (SCENE.md, Entrada).
 * Mouse: a press launches at once and holds fire. Touch: a drag steers and
 * holds fire (lasers), a quick tap launches. Only the first finger down
 * steers: a second one never moves the paddle nor ends the first one's drag;
 * pressing it while the first is down triggers Overdrive.
 */
export class InputState {
  private readonly frame: BreakerInput = {
    moveAxis: 0,
    pointerX: null,
    launchPressed: false,
    fireHeld: false,
    overdrivePressed: false,
  };

  private left = false;
  private right = false;
  private fireKey = false;
  private pointerHeld = false;
  private pointerX: number | null = null;
  private steerer: 'pointer' | 'keyboard' = 'pointer';
  private pendingLaunch = false;
  private pendingOverdrive = false;
  /** A press since the last frame: a tap or click shorter than a frame still fires once. */
  private pressedSinceSample = false;
  /** The finger that is steering, while one is down. */
  private touchId = 0;
  private touchDownAt = 0;
  private touchDownX = 0;
  private touching = false;

  get steering(): 'pointer' | 'keyboard' {
    return this.steerer;
  }

  keyDown(action: InputAction): void {
    switch (action) {
      case 'left':
        this.left = true;
        this.steerer = 'keyboard';
        break;
      case 'right':
        this.right = true;
        this.steerer = 'keyboard';
        break;
      case 'fire':
        if (!this.fireKey) this.pendingLaunch = true;
        this.fireKey = true;
        break;
      case 'overdrive':
        this.pendingOverdrive = true;
        break;
    }
  }

  keyUp(action: InputAction): void {
    if (action === 'left') this.left = false;
    else if (action === 'right') this.right = false;
    else if (action === 'fire') this.fireKey = false;
  }

  pointerMove(x: number, touch: boolean, id = 0): void {
    if (!Number.isFinite(x)) return;
    if (touch && (!this.touching || id !== this.touchId)) return;
    // A move event with no real motion (a click, a scroll) keeps the keyboard steering.
    if (this.steerer === 'keyboard' && this.pointerX !== null && Math.abs(x - this.pointerX) < 1) return;
    this.pointerX = x;
    this.steerer = 'pointer';
  }

  pointerDown(x: number, touch: boolean, timeMs: number, id = 0): void {
    if (touch && this.touching) {
      // A second finger never steers nor launches: it is the Overdrive tap.
      if (id !== this.touchId) this.pendingOverdrive = true;
      return;
    }
    if (Number.isFinite(x)) {
      this.pointerX = x;
      this.steerer = 'pointer';
    }
    this.pointerHeld = true;
    this.pressedSinceSample = true;
    if (touch) {
      this.touching = true;
      this.touchId = id;
      this.touchDownAt = timeMs;
      this.touchDownX = Number.isFinite(x) ? x : 0;
    } else {
      this.pendingLaunch = true;
    }
  }

  pointerUp(x: number, touch: boolean, timeMs: number, id = 0): void {
    if (touch && this.touching && id !== this.touchId) return; // a second finger lifting
    this.pointerHeld = false;
    if (!touch || !this.touching) return;
    this.touching = false;
    const still = Number.isFinite(x) && Math.abs(x - this.touchDownX) < TAP.MAX_MOVE;
    if (still && timeMs - this.touchDownAt < TAP.MAX_MS) this.pendingLaunch = true;
  }

  /** Nothing held, nothing pending: after a pause or a lost focus no key stays stuck down. */
  releaseAll(): void {
    this.left = false;
    this.right = false;
    this.fireKey = false;
    this.pointerHeld = false;
    this.touching = false;
    this.pendingLaunch = false;
    this.pendingOverdrive = false;
    this.pressedSinceSample = false;
  }

  /** This frame's input; edges are cleared once sampled. */
  sample(): BreakerInput {
    const f = this.frame;
    f.moveAxis = (this.right ? 1 : 0) - (this.left ? 1 : 0);
    f.pointerX = this.steerer === 'pointer' ? this.pointerX : null;
    f.launchPressed = this.pendingLaunch;
    f.overdrivePressed = this.pendingOverdrive;
    f.fireHeld = this.fireKey || this.pointerHeld || this.pressedSinceSample;
    this.pressedSinceSample = false;
    this.pendingLaunch = false;
    this.pendingOverdrive = false;
    return f;
  }
}

export interface InputHints {
  readonly launch: string;
  readonly cardFooter: string;
  readonly nova: string;
}

/** On-screen wording for the device in use. */
export function inputHints(touch: boolean): InputHints {
  return touch
    ? { launch: 'TAP TO LAUNCH', cardFooter: 'TAP TO CONTINUE', nova: '2-FINGER TAP · NOVA' }
    : { launch: 'CLICK OR SPACE TO LAUNCH', cardFooter: 'CLICK OR SPACE TO CONTINUE', nova: 'SHIFT · NOVA' };
}
