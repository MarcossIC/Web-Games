import { TAP_SLOP_PX, TurnTracker, vibrate } from '@app-input';
import type { Board, BoardEvent, Piece } from '@app/data/services/ringout/engine';
import { RingOutEffects, RingOutPainter, pieceKey } from './ringout-canvas';

/** A tap gives a ring a quarter turn, clockwise. */
const TAP_TURN = Math.PI / 2;
/** How fast a tapped ring turns, in radians a second. */
const SPIN_SPEED = 7.5;
/** How fast a rod slides out, and back after it hits something, in board units a second. */
const SLIDE_SPEED = 620;
const BOUNCE_SPEED = 380;
/** How long a hint glows, in seconds. */
const HINT_SECONDS = 2.6;
/** How far from a piece a finger or the mouse still picks it, in CSS pixels. */
const TOUCH_SLOP_PX = 14;
const MOUSE_SLOP_PX = 5;
/** The longest frame step: after a stall the pieces do not jump. */
const MAX_STEP = 1 / 20;

export interface TableEvents {
  /** The last piece left the board. */
  cleared(): void;
}

interface Spin {
  readonly ring: number;
  /** Radians still to turn, with the sign of the way it turns. */
  left: number;
}

interface Slide {
  readonly rod: number;
  readonly free: boolean;
  /** How far it goes before it is out, or before it hits. */
  readonly distance: number;
  back: boolean;
}

/** What the pointer that went down is doing. */
type Press =
  | { readonly kind: 'ring'; readonly id: number; readonly pointer: number; readonly startAngle: number; readonly x: number; readonly y: number; turning: boolean; blocked: boolean }
  | { readonly kind: 'locked'; readonly pointer: number }
  | { readonly kind: 'rod'; readonly id: number; readonly pointer: number };

/**
 * The board on the screen, played: it draws the pieces, turns and slides
 * them as the player asks, and lets them break. The rules are the board's;
 * this is how they look and feel. Plain DOM and canvas, no Angular, so it
 * runs outside the zone.
 */
export class RingOutTable {
  private readonly painter: RingOutPainter;
  private readonly fx = new RingOutEffects();
  private readonly turns = new TurnTracker();
  private board: Board | null = null;
  private spins: Spin[] = [];
  private slide: Slide | null = null;
  private press: Press | null = null;
  private hover: Piece | null = null;
  private hint: { piece: Piece; until: number } | null = null;
  private time = 0;
  private dirty = true;
  private done = false;
  /** False while the game is paused or over: the pointer does nothing. */
  enabled = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly events: TableEvents
  ) {
    this.painter = new RingOutPainter(canvas);
  }

  /** A new level: fits it to the screen and forgets everything about the last one. */
  setBoard(board: Board): void {
    this.board = board;
    this.spins = [];
    this.slide = null;
    this.press = null;
    this.hover = null;
    this.hint = null;
    this.done = false;
    this.fx.clear();
    this.painter.fit(board.bounds());
    this.canvas.style.cursor = '';
    this.dirty = true;
  }

  resize(width: number, height: number, ratio: number): void {
    this.painter.resize(width, height, ratio);
    this.dirty = true;
  }

  showHint(piece: Piece | null): void {
    if (!piece) return;
    this.hint = { piece, until: this.time + HINT_SECONDS };
    this.dirty = true;
  }

  /** Moves everything on by `dt` seconds and draws, if anything changed. */
  frame(dt: number): void {
    const step = Math.min(Math.max(dt, 0), MAX_STEP);
    this.time += step;
    const board = this.board;
    if (!board) return;

    if (this.spins.length > 0 || this.slide) {
      this.stepSpins(board, step);
      this.stepSlide(board, step);
      this.dirty = true;
    }
    if (this.fx.active) {
      this.fx.step(step);
      this.dirty = true;
    }
    if (this.hint) {
      if (this.time > this.hint.until || !this.alive(board, this.hint.piece)) this.hint = null;
      this.dirty = true;
    }
    if (!this.dirty) return;
    this.dirty = false;
    const active = this.press && this.press.kind !== 'locked' ? { kind: this.press.kind, id: this.press.id } : this.hover;
    this.painter.draw(board, this.fx, {
      active: active && this.alive(board, active) ? active : null,
      hint: this.hint?.piece ?? null,
      time: this.time,
    });
  }

  // ---- Pointer ------------------------------------------------------

  pointerDown(event: PointerEvent): void {
    const board = this.board;
    if (!board || !this.enabled || this.press) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const at = this.local(event);
    const piece = board.pieceAt(this.painter.toBoard(at.x, at.y), this.slop(event) / this.painter.unit);
    if (!piece) return;
    this.capture(event);

    if (piece.kind === 'rod') {
      this.press = { kind: 'rod', id: piece.id, pointer: event.pointerId };
      this.dirty = true;
      return;
    }
    if (!board.canTurn(piece.id)) {
      this.press = { kind: 'locked', pointer: event.pointerId };
      this.refuse(board, piece.id);
      return;
    }
    if (this.slide || this.spins.some((spin) => spin.ring === piece.id)) {
      this.press = { kind: 'locked', pointer: event.pointerId };
      return;
    }
    const ring = board.rings[piece.id];
    this.turns.down(event.pointerId, at, this.painter.toScreen(ring.center), event.timeStamp);
    this.press = {
      kind: 'ring',
      id: piece.id,
      pointer: event.pointerId,
      startAngle: ring.angle,
      x: at.x,
      y: at.y,
      turning: false,
      blocked: false,
    };
    this.dirty = true;
  }

  pointerMove(event: PointerEvent): void {
    const board = this.board;
    if (!board) return;
    const at = this.local(event);
    const press = this.press;
    if (!press) {
      if (event.pointerType === 'mouse') this.hoverAt(board, at, event);
      return;
    }
    if (press.kind !== 'ring' || press.pointer !== event.pointerId) return;
    const swept = this.turns.move(event.pointerId, at);
    if (swept === null) return;
    if (!press.turning && Math.hypot(at.x - press.x, at.y - press.y) < TAP_SLOP_PX) return;
    press.turning = true;
    const ring = board.rings[press.id];
    if (!ring.alive) return;
    const outcome = board.turn(press.id, press.startAngle + swept - ring.angle);
    this.react(board, outcome.events);
    // One buzz when the ring runs into something, not one per move.
    if (outcome.blocked && !press.blocked) {
      vibrate(12);
      this.fx.shake({ kind: 'ring', id: press.id }, 1.5);
    }
    press.blocked = outcome.blocked;
    if (!ring.alive) this.release();
    this.dirty = true;
  }

  pointerUp(event: PointerEvent): void {
    const board = this.board;
    const press = this.press;
    if (!board || !press || press.pointer !== event.pointerId) return;
    this.release();
    if (press.kind === 'ring') {
      const gesture = this.turns.up(event.pointerId, event.timeStamp);
      if (gesture === 'tap' && !press.turning && this.enabled) this.spins.push({ ring: press.id, left: TAP_TURN });
    } else if (press.kind === 'rod' && this.enabled) {
      this.pull(board, press.id);
    }
    if (event.pointerType === 'mouse') this.hoverAt(board, this.local(event), event);
  }

  pointerCancel(event: PointerEvent): void {
    if (this.press?.pointer !== event.pointerId) return;
    this.turns.cancel(event.pointerId);
    this.release();
  }

  pointerLeave(): void {
    if (this.hover) {
      this.hover = null;
      this.dirty = true;
    }
    if (!this.press) this.canvas.style.cursor = '';
  }

  // ---- Moves --------------------------------------------------------

  private pull(board: Board, rodId: number): void {
    if (this.slide || this.spins.length > 0 || !board.rods[rodId]?.alive) return;
    const plan = board.slidePlan(rodId);
    this.slide = { rod: rodId, free: plan.free, distance: plan.distance, back: false };
  }

  private stepSpins(board: Board, dt: number): void {
    for (const spin of [...this.spins]) {
      const ring = board.rings[spin.ring];
      const want = Math.sign(spin.left) * Math.min(Math.abs(spin.left), SPIN_SPEED * dt);
      const outcome = ring.alive ? board.turn(spin.ring, want) : null;
      if (outcome) {
        spin.left -= outcome.turned;
        this.react(board, outcome.events);
      }
      const finished = !outcome || !ring.alive || outcome.blocked || Math.abs(spin.left) < 1e-6;
      if (outcome?.blocked && ring.alive) {
        this.fx.shake({ kind: 'ring', id: spin.ring }, 2.5);
        vibrate(15);
      }
      if (finished) this.spins = this.spins.filter((s) => s !== spin);
    }
  }

  private stepSlide(board: Board, dt: number): void {
    const slide = this.slide;
    if (!slide) return;
    const rod = board.rods[slide.rod];
    if (!slide.back) {
      rod.offset = Math.min(slide.distance, rod.offset + SLIDE_SPEED * dt);
      if (rod.offset < slide.distance) return;
      if (slide.free) {
        const points = board.rodPoints(rod);
        this.react(board, board.removeRod(slide.rod), points);
        this.slide = null;
        return;
      }
      slide.back = true;
      this.fx.shake({ kind: 'rod', id: slide.rod }, 2);
      vibrate(15);
      return;
    }
    rod.offset = Math.max(0, rod.offset - BOUNCE_SPEED * dt);
    if (rod.offset === 0) this.slide = null;
  }

  /** Shows what the rules did: clips that snap, rings and rods that break. */
  private react(board: Board, events: readonly BoardEvent[], rodPoints?: readonly { x: number; y: number }[]): void {
    if (events.length === 0) return;
    for (const event of events) {
      if (event.kind === 'release') {
        this.fx.breakClip(event.clip, board.rings[event.clip.from].color);
      } else if (event.kind === 'shatter') {
        this.fx.breakRing(board, event.ring);
      } else if (rodPoints) {
        this.fx.breakRod(rodPoints, event.rod.color);
      }
    }
    vibrate(events.some((e) => e.kind !== 'release') ? 35 : 15);
    if (board.cleared && !this.done) {
      this.done = true;
      this.events.cleared();
    }
  }

  /** A ring that holds a clip shakes, and the clips that hold it back flash. */
  private refuse(board: Board, ringId: number): void {
    this.fx.shake({ kind: 'ring', id: ringId }, 3);
    for (const clip of board.holding(ringId)) this.fx.flashClip(clip.id);
    vibrate([10, 40, 10]);
    this.dirty = true;
  }

  private release(): void {
    this.press = null;
    this.dirty = true;
  }

  // ---- Helpers ------------------------------------------------------

  private hoverAt(board: Board, at: { x: number; y: number }, event: PointerEvent): void {
    const piece = this.enabled ? board.pieceAt(this.painter.toBoard(at.x, at.y), this.slop(event) / this.painter.unit) : null;
    if (pieceKeyOf(piece) !== pieceKeyOf(this.hover)) {
      this.hover = piece;
      this.dirty = true;
    }
    this.canvas.style.cursor = !piece ? '' : piece.kind === 'rod' || board.canTurn(piece.id) ? 'pointer' : 'not-allowed';
  }

  private alive(board: Board, piece: Piece): boolean {
    return piece.kind === 'ring' ? !!board.rings[piece.id]?.alive : !!board.rods[piece.id]?.alive;
  }

  private local(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private slop(event: PointerEvent): number {
    return event.pointerType === 'mouse' ? MOUSE_SLOP_PX : TOUCH_SLOP_PX;
  }

  private capture(event: PointerEvent): void {
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that is already gone: nothing to hold on to.
    }
  }
}

function pieceKeyOf(piece: Piece | null): string {
  return piece ? pieceKey(piece) : '';
}
