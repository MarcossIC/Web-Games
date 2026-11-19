/**
 * A small seeded random generator (mulberry32). The engine never calls
 * Math.random: every roll comes from here, so the same seed and the same
 * inputs replay the same run. Nova Breaker keeps its own copy instead of
 * borrowing the Retro Runner's, so the two games stay independent.
 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    // Fractions and negatives are folded into a 32-bit integer; a seed of 0
    // works too, mulberry32 has no bad state.
    this.s = Math.floor(seed) >>> 0;
  }

  /** A number in [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** A number in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** An integer in [min, max], both ends included. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }
}

/** Mixes two integers into one seed, so each sector gets its own stream. */
export function mixSeed(a: number, b: number): number {
  let h = (Math.floor(a) ^ Math.imul(Math.floor(b) + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
