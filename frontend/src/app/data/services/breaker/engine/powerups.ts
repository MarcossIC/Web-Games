import { CAPSULE, DROPS, EFFECT_MS, EFFECTS } from './config';
import { DIFFICULTY } from './difficulty';
import type { Rng } from './rng';
import type { ActiveEffect, BrickKind, PowerUpKind, TimedEffectKind } from './types';

/**
 * Power-ups: when a broken brick drops a capsule, which one it is, and the
 * timers of the effects that last a while. What an effect does to the balls
 * and the paddle lives in the engine; the rules that can be told apart from
 * the physics (stacking, cancelling, refreshing) live here.
 */

export const POSITIVE_POWER_UPS = ['multi', 'wide', 'laser', 'magnet', 'slow', 'fire', 'barrier', 'life', 'nova'] as const;
export const NEGATIVE_POWER_UPS = ['shrink', 'fast'] as const;

/** Relative weight of each positive; life is rare on purpose. */
export const POSITIVE_WEIGHTS: Readonly<Record<(typeof POSITIVE_POWER_UPS)[number], number>> = {
  multi: 14,
  wide: 14,
  laser: 11,
  magnet: 8,
  slow: 10,
  fire: 7,
  barrier: 9,
  life: 2,
  nova: 6,
};

const POSITIVE_TOTAL = POSITIVE_POWER_UPS.reduce((sum, kind) => sum + POSITIVE_WEIGHTS[kind], 0);

const TIMED: ReadonlySet<PowerUpKind> = new Set<PowerUpKind>(['wide', 'laser', 'magnet', 'slow', 'fire', 'barrier', 'shrink', 'fast']);

export function isTimedEffect(kind: PowerUpKind): kind is TimedEffectKind {
  return TIMED.has(kind);
}

export interface DropContext {
  sector: number;
  brickKind: BrickKind;
  /** Bricks destroyed in this sector before this one. */
  bricksBrokenInSector: number;
  dropChance: number;
  mercy: boolean;
  capsulesFalling: number;
}

/** Whether a destroyed brick drops a capsule. */
export function shouldDrop(ctx: DropContext, rng: Rng): boolean {
  // The cap holds even for capsule bricks: five capsules at once are noise, not help.
  if (ctx.capsulesFalling >= CAPSULE.MAX_FALLING || ctx.brickKind === 'steel') return false;
  if (ctx.brickKind === 'capsule') return true;
  if (ctx.sector === 1 && ctx.bricksBrokenInSector < DROPS.GUARANTEED_FIRST_BRICKS) return true;
  const chance = ctx.mercy ? ctx.dropChance * DROPS.MERCY_FACTOR : ctx.dropChance;
  return rng.chance(chance);
}

/**
 * Which capsule falls. Negatives come only from sector 5 on, at the
 * sector's weight; the rest are positives by their weights.
 */
export function pickPowerUp(sector: number, negativeWeight: number, rng: Rng): PowerUpKind {
  if (sector >= DIFFICULTY.NEGATIVES.FROM_SECTOR && negativeWeight > 0 && rng.chance(negativeWeight)) {
    return rng.pick(NEGATIVE_POWER_UPS);
  }
  let roll = rng.next() * POSITIVE_TOTAL;
  for (const kind of POSITIVE_POWER_UPS) {
    roll -= POSITIVE_WEIGHTS[kind];
    if (roll < 0) return kind;
  }
  return POSITIVE_POWER_UPS[0];
}

/** Effects that undo each other: catching one ends the other. */
const OPPOSITE: Partial<Record<TimedEffectKind, TimedEffectKind>> = {
  wide: 'shrink',
  shrink: 'wide',
  slow: 'fast',
  fast: 'slow',
};

interface MutableEffect extends ActiveEffect {
  durationMs: number;
}

/**
 * The timed effects running now. `list` is the very array the state
 * exposes to the view, kept in the order the effects were caught.
 */
export class EffectTimers {
  readonly list: MutableEffect[] = [];

  get(kind: TimedEffectKind): ActiveEffect | undefined {
    for (const effect of this.list) if (effect.kind === kind) return effect;
    return undefined;
  }

  has(kind: TimedEffectKind): boolean {
    return this.get(kind) !== undefined;
  }

  stacks(kind: TimedEffectKind): number {
    return this.get(kind)?.stacks ?? 0;
  }

  /**
   * Starts an effect, or refreshes it when it is already running (wide also
   * gains a stack, up to 2). An opposite effect running is ended, and pushed
   * to `ended` so the view can say so.
   */
  activate(kind: TimedEffectKind, durationScale: number, ended: TimedEffectKind[]): void {
    const opposite = OPPOSITE[kind];
    if (opposite && this.remove(opposite)) ended.push(opposite);

    const durationMs = EFFECT_MS[kind] * durationScale;
    const running = this.list.find((effect) => effect.kind === kind);
    if (running) {
      running.durationMs = durationMs;
      running.remainingMs = durationMs;
      if (kind === 'wide') running.stacks = Math.min(EFFECTS.WIDE_MAX_STACKS, running.stacks + 1);
      return;
    }
    this.list.push({ kind, durationMs, remainingMs: durationMs, stacks: 1 });
  }

  /** Lets time pass; effects that run out are removed and pushed to `ended`. */
  tick(ms: number, ended: TimedEffectKind[]): void {
    let kept = 0;
    for (let i = 0; i < this.list.length; i++) {
      const effect = this.list[i];
      effect.remainingMs -= ms;
      if (effect.remainingMs <= 0) {
        ended.push(effect.kind);
        continue;
      }
      this.list[kept++] = effect;
    }
    this.list.length = kept;
  }

  /** Ends one effect now, silently. True if it was running. */
  remove(kind: TimedEffectKind): boolean {
    const index = this.list.findIndex((effect) => effect.kind === kind);
    if (index < 0) return false;
    this.list.splice(index, 1);
    return true;
  }

  /** Ends every effect (a life lost, a new sector), pushing each to `ended`. */
  clear(ended?: TimedEffectKind[]): void {
    if (ended) for (const effect of this.list) ended.push(effect.kind);
    this.list.length = 0;
  }
}

/** Paddle width multiplier: wide adds 50% per stack, shrink takes 35%. */
export function paddleWidthFactor(effects: EffectTimers): number {
  if (effects.has('shrink')) return EFFECTS.SHRINK_FACTOR;
  return 1 + EFFECTS.WIDE_FACTOR_PER_STACK * effects.stacks('wide');
}

/** Ball speed multiplier from slow and fast (they never run together). */
export function ballSpeedFactor(effects: EffectTimers): number {
  if (effects.has('slow')) return EFFECTS.SLOW_FACTOR;
  if (effects.has('fast')) return EFFECTS.FAST_FACTOR;
  return 1;
}

/**
 * After 2 lives lost within 30 s, capsules drop 50% more often for 30 s:
 * a player who is struggling gets a hand without asking for it.
 */
export class MercyTracker {
  private lastLossAt = Number.NEGATIVE_INFINITY;
  private until = Number.NEGATIVE_INFINITY;

  lifeLost(nowMs: number): void {
    if (nowMs - this.lastLossAt <= DROPS.MERCY_WINDOW_MS) this.until = nowMs + DROPS.MERCY_MS;
    this.lastLossAt = nowMs;
  }

  active(nowMs: number): boolean {
    return nowMs < this.until;
  }
}

/** How many new balls one ball may add (2 for multi, 1 for a prism) under the cap. */
export function splitCount(current: number, perBall: number, cap: number): number {
  return Math.max(0, Math.min(perBall, cap - current));
}

/** Rotates (vx, vy) by `rad` into `out`; the speed stays the same. */
export function rotateInto(vx: number, vy: number, rad: number, out: { x: number; y: number }): void {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  out.x = vx * c - vy * s;
  out.y = vx * s + vy * c;
}
