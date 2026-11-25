import { TAP_MAX_MS, TAP_SLOP_PX } from './drag';

export interface TurnPoint {
  readonly x: number;
  readonly y: number;
}

export interface TurnOptions {
  readonly tapSlopPx?: number;
  readonly tapMaxMs?: number;
  /**
   * Closer than this to the center the angle of the pointer jumps about
   * with every pixel: moves there are not counted.
   */
  readonly deadZonePx?: number;
}

interface Stroke {
  readonly id: number;
  readonly center: TurnPoint;
  readonly startX: number;
  readonly startY: number;
  readonly startTime: number;
  /** The angle of the pointer around the center at the last move counted. */
  last: number | null;
  /** The angle swept since it went down, unwrapped. */
  swept: number;
  travelled: boolean;
}

/**
 * A finger or the mouse turning something round a center, as a knob or a
 * ring: it adds up the angle the pointer sweeps around the center, so a
 * turn and a half reads as 3π, and tells a tap from a turn. Angles grow
 * clockwise on screen, where y points down.
 *
 * Only one pointer turns at a time: a new one going down takes over.
 */
export class TurnTracker {
  private stroke: Stroke | null = null;
  private readonly tapSlopPx: number;
  private readonly tapMaxMs: number;
  private readonly deadZonePx: number;

  constructor(options: TurnOptions = {}) {
    this.tapSlopPx = options.tapSlopPx ?? TAP_SLOP_PX;
    this.tapMaxMs = options.tapMaxMs ?? TAP_MAX_MS;
    this.deadZonePx = options.deadZonePx ?? 8;
  }

  /** A pointer is turning. */
  get active(): boolean {
    return this.stroke !== null;
  }

  /** The pointer went down at `point`, to turn something round `center`. */
  down(id: number, point: TurnPoint, center: TurnPoint, time: number): void {
    this.stroke = {
      id,
      center,
      startX: point.x,
      startY: point.y,
      startTime: time,
      last: this.angleAt(point, center),
      swept: 0,
      travelled: false,
    };
  }

  /**
   * The pointer moved. Returns the angle swept since it went down, in
   * radians (clockwise positive), or null if it is not the pointer turning.
   */
  move(id: number, point: TurnPoint): number | null {
    const stroke = this.stroke;
    if (!stroke || stroke.id !== id) return null;
    if (Math.hypot(point.x - stroke.startX, point.y - stroke.startY) >= this.tapSlopPx) {
      stroke.travelled = true;
    }
    const angle = this.angleAt(point, stroke.center);
    if (angle === null) return stroke.swept;
    if (stroke.last !== null) {
      let step = angle - stroke.last;
      if (step > Math.PI) step -= Math.PI * 2;
      else if (step < -Math.PI) step += Math.PI * 2;
      stroke.swept += step;
    }
    stroke.last = angle;
    return stroke.swept;
  }

  /** The pointer came up. 'tap' if it tapped, 'turn' if it turned, null if it was not turning. */
  up(id: number, time: number): 'tap' | 'turn' | null {
    const stroke = this.stroke;
    if (!stroke || stroke.id !== id) return null;
    this.stroke = null;
    return !stroke.travelled && time - stroke.startTime <= this.tapMaxMs ? 'tap' : 'turn';
  }

  /** The system took the pointer (pointercancel): neither a turn nor a tap. */
  cancel(id: number): void {
    if (this.stroke?.id === id) this.stroke = null;
  }

  private angleAt(point: TurnPoint, center: TurnPoint): number | null {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    if (Math.hypot(dx, dy) < this.deadZonePx) return null;
    return Math.atan2(dy, dx);
  }
}
