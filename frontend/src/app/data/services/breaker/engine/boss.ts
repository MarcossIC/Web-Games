import { BOSS, GRID } from './config';
import { isSpecialSector } from './difficulty';
import type { BossPhase, BrickKind, PowerUpKind } from './types';

/**
 * The rules of THE CORE, the boss of every 5th sector, that can be told
 * apart from the physics: who it is, how tough, its phases, its volleys and
 * the shape of its shield. The engine moves it and resolves its hits.
 */

/** Every 5th sector (5, 10, 15, ...) is a boss sector. */
export function isBossSector(sector: number): boolean {
  return isSpecialSector(sector);
}

/** 1 for the boss of sector 5, 2 for sector 10...; 0 outside boss sectors. */
export function bossNumber(sector: number): number {
  return isBossSector(sector) ? Math.floor(sector / 5) : 0;
}

export function bossMaxHp(number: number): number {
  return BOSS.BASE_HP + BOSS.HP_PER_BOSS * Math.max(0, number - 1);
}

export function bossBonus(number: number): number {
  return BOSS.BONUS_PER_BOSS * Math.max(1, number);
}

/** Phase 2 under 60% of max hp, phase 3 under 30%. */
export function bossPhaseFor(hp: number, maxHp: number): BossPhase {
  if (hp < maxHp * BOSS.PHASE_3_SHARE) return 3;
  if (hp < maxHp * BOSS.PHASE_2_SHARE) return 2;
  return 1;
}

/** Pellets per volley: one, then a pair, then a fan of three. */
export function volleyCount(phase: BossPhase): number {
  return phase;
}

const DEG = Math.PI / 180;

/**
 * Angle from straight down (positive towards +x) of pellet `index` of a
 * volley. Phase 3 centers its fan on `aim`, the angle to the paddle,
 * capped so a pellet never flies flat.
 */
export function volleyAngle(phase: BossPhase, index: number, aim: number): number {
  const spread = BOSS.PELLET_SPREAD_DEG * DEG;
  if (phase === 1) return 0;
  if (phase === 2) return (index === 0 ? -0.5 : 0.5) * spread;
  const cap = BOSS.MAX_AIM_DEG * DEG;
  const center = Math.max(-cap, Math.min(cap, aim));
  return center + (index - 1) * spread;
}

const PHASE_CAPSULES: Readonly<Record<BossPhase, readonly PowerUpKind[]>> = {
  1: [],
  2: ['multi', 'laser'],
  3: ['fire', 'multi'],
};

/** Capsules that always fall when a phase starts: help to break through. */
export function phaseCapsules(phase: BossPhase): readonly PowerUpKind[] {
  return PHASE_CAPSULES[phase];
}

export interface ShieldSlot {
  /** Top-left of the brick from the core's top-left corner. */
  readonly dx: number;
  readonly dy: number;
  /** Brick tone (palette index) of the slot. */
  readonly tone: number;
}

/**
 * Eight bricks around the core: 0..3 under it (left to right, covering the
 * eye), 4..5 on its left (top, bottom), 6..7 on its right. They move with
 * the core; 4 px of air keeps them off it.
 */
export const SHIELD_SLOTS: readonly ShieldSlot[] = [
  { dx: 2, dy: 64, tone: 2 },
  { dx: 72, dy: 64, tone: 2 },
  { dx: 142, dy: 64, tone: 2 },
  { dx: 212, dy: 64, tone: 2 },
  { dx: -70, dy: 1, tone: 5 },
  { dx: -70, dy: 31, tone: 5 },
  { dx: 284, dy: 1, tone: 5 },
  { dx: 284, dy: 31, tone: 5 },
];

/**
 * How far under the core's top a shield sits. The side stacks are laid out
 * for the desktop row stride (30): on a tall world, with taller bricks, the
 * lower brick of each stack moves down with the stride so the two never overlap.
 * The row under the core stays where it is.
 */
export function shieldOffsetY(slot: ShieldSlot, strideY: number): number {
  if (slot.dy >= BOSS.H) return slot.dy;
  return 1 + ((slot.dy - 1) / GRID.STRIDE_Y) * strideY;
}

/** Which shields an explosive shield takes with it. */
export const SHIELD_NEIGHBORS: readonly (readonly number[])[] = [[1, 5], [0, 2], [1, 3], [2, 7], [5], [4, 0], [7], [6, 3]];

/** The order shields grow back in: the two over the eye first. */
export const SHIELD_REGEN_ORDER: readonly number[] = [1, 2, 0, 3, 5, 7, 4, 6];

const SHIELD_KINDS: readonly (readonly BrickKind[])[] = [
  ['tough', 'normal', 'normal', 'tough', 'normal', 'explosive', 'explosive', 'normal'],
  ['tough', 'tough', 'tough', 'tough', 'tough', 'explosive', 'explosive', 'tough'],
  ['armored', 'tough', 'tough', 'armored', 'armored', 'explosive', 'explosive', 'armored'],
];

/** The brick kind of each shield slot: harder with each boss. */
export function shieldKinds(number: number): readonly BrickKind[] {
  return SHIELD_KINDS[Math.min(SHIELD_KINDS.length, Math.max(1, number)) - 1];
}

/** Smoothstep: the core leaves a waypoint slowly, speeds up, and settles. */
export function glideEase(t: number): number {
  const x = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}
