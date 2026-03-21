/**
 * SFC32 — Small Fast Chaotic PRNG.
 * 128-bit internal state, period ~2^128.
 * Passes PractRand full suite. Same speed as Mulberry32.
 * Deterministic: same seed always produces the same sequence.
 */

/**
 * Hash any string or number into four well-distributed 32-bit values.
 * Uses cyrb128 — a fast, high-quality hash suitable for seeding PRNGs.
 */
function cyrb128(input: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < input.length; i++) {
    const k = input.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= (h2 ^ h3 ^ h4); h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Generate a random master seed string if none is provided */
function generateSeedString(): string {
  // 8 hex chars = 32 bits of entropy, human-shareable
  const raw = Date.now() ^ ((Math.random() * 0x100000000) >>> 0);
  return (raw >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

class SeededRandom {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  /** The human-readable seed string used to initialize this PRNG */
  public readonly seedKey: string;

  /**
   * Create a new SFC32 PRNG.
   * @param seed - A string or number. Strings are hashed via cyrb128.
   *               Numbers are converted to hex strings first.
   *               If omitted, a random seed is generated.
   */
  constructor(seed?: string | number) {
    if (seed === undefined) {
      this.seedKey = generateSeedString();
    } else if (typeof seed === 'number') {
      this.seedKey = (seed >>> 0).toString(16).toUpperCase().padStart(8, '0');
    } else {
      this.seedKey = seed;
    }

    const [h1, h2, h3, h4] = cyrb128(this.seedKey);
    this.a = h1;
    this.b = h2;
    this.c = h3;
    this.d = h4;

    // Warm up — discard first 15 values to diffuse the initial state
    for (let i = 0; i < 15; i++) this.next();
  }

  /** Returns a float in [0, 1) */
  next(): number {
    this.a >>>= 0; this.b >>>= 0; this.c >>>= 0; this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 0x100000000;
  }

  /** Integer in [0, max] when includeZero=true, or [1, max] when false */
  integer(includeZero: boolean, max: number): number {
    const base = includeZero ? 0 : 1;
    return Math.floor(this.next() * max) + base;
  }

  /** Float in [min, max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Returns true with the given probability (0-1) */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** Pick a random element from an array */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /**
   * Create an independent sub-stream derived from this PRNG's seed.
   * The channel name ensures different streams produce different sequences
   * even from the same master seed — prevents butterfly effect.
   */
  fork(channel: string): SeededRandom {
    return new SeededRandom(this.seedKey + ':' + channel);
  }
}

export default SeededRandom;
