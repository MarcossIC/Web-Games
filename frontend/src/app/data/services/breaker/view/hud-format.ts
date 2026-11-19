import { formatTime } from '../engine/records';

/**
 * Texts of the HUD and the floating labels. Pure, so the scene only calls
 * `setText` with what these return, and only when the value changed.
 */

/** 12345 -> "12,345". Fractions are cut; garbage and negatives read 0. */
export function formatScore(value: number): string {
  const safe = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  const digits = String(safe);
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ',';
    out += digits[i];
  }
  return out;
}

/** 2.34 -> "x2.3". */
export function formatMultiplier(multiplier: number): string {
  const safe = Number.isFinite(multiplier) && multiplier >= 1 ? multiplier : 1;
  return `x${safe.toFixed(1)}`;
}

/** 3 -> "SECTOR 03". */
export function sectorLabel(sector: number): string {
  return `SECTOR ${String(Math.max(0, Math.floor(sector))).padStart(2, '0')}`;
}

/** Share of a timed effect left, 0..1: the width of its HUD bar. */
export function effectRatio(remainingMs: number, durationMs: number): number {
  if (!(durationMs > 0) || !Number.isFinite(remainingMs)) return 0;
  return Math.min(1, Math.max(0, remainingMs / durationMs));
}

/** Whole seconds as m:ss: the par is always a round number. */
function formatPar(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** "0:24.10 / PAR 0:45": the sector time against its par. */
export function paceLabel(sectorMs: number, parMs: number): string {
  return `${formatTime(sectorMs)} / PAR ${formatPar(parMs)}`;
}

/** "+150 x2.3" over a broken brick; the multiplier only when it pays more. */
export function pointsLabel(points: number, multiplier: number): string {
  const base = `+${formatScore(points)}`;
  return multiplier > 1.05 ? `${base} ${formatMultiplier(multiplier)}` : base;
}

export function comboLabel(combo: number): string {
  return `${Math.max(0, Math.floor(combo))} COMBO`;
}
