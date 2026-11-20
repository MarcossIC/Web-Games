import { BreakerTexture, brickTextureKey } from '@app/data/models/breaker/BreakerKeys';
import { toneColor } from '../assets/breaker-themes';
import { BRICK } from '../engine/config';
import type { ActiveEffect, BrickKind, TimedEffectKind } from '../engine/types';

/** Which texture, overlay or tint each piece of state is drawn with. Pure. */

export function brickBaseTexture(kind: BrickKind, theme: number, tone: number): string {
  switch (kind) {
    case 'steel':
      return BreakerTexture.STEEL;
    case 'explosive':
      return BreakerTexture.EXPLOSIVE;
    case 'capsule':
      return BreakerTexture.CAPSULE_BRICK;
    case 'prism':
      return BreakerTexture.PRISM;
    default:
      return brickTextureKey(theme, tone);
  }
}

export interface BrickOverlays {
  /** The armor plate over an armored brick that still has it. */
  plate: boolean;
  crack: typeof BreakerTexture.CRACK_1 | typeof BreakerTexture.CRACK_2 | null;
}

const NONE: BrickOverlays = Object.freeze({ plate: false, crack: null }) as BrickOverlays;
const TOUGH_CRACKED: BrickOverlays = Object.freeze({ plate: false, crack: BreakerTexture.CRACK_1 }) as BrickOverlays;
const ARMOR_FULL: BrickOverlays = Object.freeze({ plate: true, crack: null }) as BrickOverlays;
const ARMOR_CRACKED: BrickOverlays = Object.freeze({ plate: true, crack: BreakerTexture.CRACK_1 }) as BrickOverlays;
const ARMOR_BROKEN: BrickOverlays = Object.freeze({ plate: false, crack: BreakerTexture.CRACK_2 }) as BrickOverlays;

/**
 * Damage overlays: a tough brick cracks at 1 hp; an armored one shows its
 * plate at 3, plate and a crack at 2, a deep crack at 1. Shared frozen
 * results, so asking every frame allocates nothing.
 */
export function brickOverlays(kind: BrickKind, hp: number): BrickOverlays {
  if (kind === 'tough') return hp <= 1 ? TOUGH_CRACKED : NONE;
  if (kind === 'armored') {
    if (hp >= 3) return ARMOR_FULL;
    return hp === 2 ? ARMOR_CRACKED : ARMOR_BROKEN;
  }
  return NONE;
}

/** 0..1 alpha of the white hit flash. */
export function flashAlpha(flashMs: number): number {
  if (!(flashMs > 0)) return 0;
  return Math.min(1, flashMs / BRICK.FLASH_MS);
}

const SPECIAL_SHARDS: Partial<Record<BrickKind, number>> = {
  steel: 0xc9d1e6,
  explosive: 0xff9a3d,
  capsule: 0xffe14a,
  prism: 0xe6f7ff,
};

/** Shards of a broken brick take its tone; special bricks keep their own color. */
export function shardColor(kind: BrickKind, theme: number, tone: number): number {
  return SPECIAL_SHARDS[kind] ?? toneColor(theme, tone);
}

export function findEffect(effects: readonly Readonly<ActiveEffect>[], kind: TimedEffectKind): Readonly<ActiveEffect> | null {
  for (let i = 0; i < effects.length; i++) {
    if (effects[i].kind === kind) return effects[i];
  }
  return null;
}

/** Laser cannons show over the magnet coils, the magnet over the plain paddle. */
export function paddleTextureKey(effects: readonly Readonly<ActiveEffect>[]): string {
  if (findEffect(effects, 'laser')) return BreakerTexture.PADDLE_LASER;
  if (findEffect(effects, 'magnet')) return BreakerTexture.PADDLE_MAGNET;
  return BreakerTexture.PADDLE;
}

/** 0 normal, 1 fire, 2 nova: the index into the ball textures and trail tints. */
export type BallLook = 0 | 1 | 2;

export function ballLook(fire: boolean, nova: boolean): BallLook {
  if (nova) return 2;
  return fire ? 1 : 0;
}

export const BALL_TEXTURES: readonly string[] = [BreakerTexture.BALL, BreakerTexture.BALL_FIRE, BreakerTexture.BALL_NOVA];
export const TRAIL_TINTS: readonly number[] = [0x8cf0ff, 0xff9a3d, 0xff2e88];

export interface BreakerFlags {
  /** ?sheet=1: show the texture sheet instead of the game. */
  sheet: boolean;
  /** ?fps=1: show the frame rate. */
  fps: boolean;
}

/** Dev review tools only: in production (`dev` false) every flag is off. */
export function readBreakerFlags(search: string, dev: boolean): BreakerFlags {
  if (!dev) return { sheet: false, fps: false };
  const params = new URLSearchParams(search);
  return { sheet: params.get('sheet') === '1', fps: params.get('fps') === '1' };
}

/**
 * ?sector=N: start the run in sector N (1..99), to review a boss without
 * playing up to it. Dev builds only (`dev`): in production it is always 1.
 * Such a run is a practice run (RunSummary.practice) and is never recorded.
 */
export function readStartSector(search: string, dev: boolean): number {
  if (!dev) return 1;
  const value = Math.floor(Number(new URLSearchParams(search).get('sector')));
  return Number.isFinite(value) && value >= 1 ? Math.min(99, value) : 1;
}
