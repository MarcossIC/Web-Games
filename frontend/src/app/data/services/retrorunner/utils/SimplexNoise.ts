/**
 * Simplex Noise 2D — fast, no directional artifacts.
 * Based on Stefan Gustavson's implementation.
 * Used for organic terrain height generation.
 */

const GRAD3: number[][] = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

class SimplexNoise {
  private perm: Uint8Array;
  /** Large coordinate offsets derived from seed — each run samples a different region */
  public readonly offsetX: number;
  public readonly offsetY: number;

  constructor(seed: number) {
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);

    // Seed-based permutation using a simple hash
    let s = seed;
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      s = ((s * 16807) + 0) % 2147483647;
      const j = s % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }

    // Derive domain offsets from seed (range +-10000, safe from float precision issues)
    s = ((s * 16807) + 0) % 2147483647;
    this.offsetX = (s / 2147483647) * 20000 - 10000;
    s = ((s * 16807) + 0) % 2147483647;
    this.offsetY = (s / 2147483647) * 20000 - 10000;
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  /** Returns a value in approximately [-1, 1] */
  noise2D(xIn: number, yIn: number): number {
    // Apply domain offset so each seed samples a different noise region
    const x = xIn + this.offsetX;
    const y = yIn + this.offsetY;
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;

    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1: number, j1: number;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      const gi0 = this.perm[ii + this.perm[jj]] % 8;
      t0 *= t0;
      n0 = t0 * t0 * (GRAD3[gi0][0] * x0 + GRAD3[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 8;
      t1 *= t1;
      n1 = t1 * t1 * (GRAD3[gi1][0] * x1 + GRAD3[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 8;
      t2 *= t2;
      n2 = t2 * t2 * (GRAD3[gi2][0] * x2 + GRAD3[gi2][1] * y2);
    }

    // Scale to [-1, 1]
    return 70.0 * (n0 + n1 + n2);
  }

  /**
   * Fractal Brownian Motion — layer multiple octaves for natural detail.
   * @param x - position
   * @param y - position (use 0 for 1D height)
   * @param octaves - layers of detail (2-4 recommended)
   * @param lacunarity - frequency multiplier per octave (typically 2.0)
   * @param persistence - amplitude decay per octave (typically 0.5)
   */
  fbm(x: number, y: number, octaves: number = 3, lacunarity: number = 2.0, persistence: number = 0.5): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxAmplitude = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxAmplitude += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxAmplitude; // Normalize to [-1, 1]
  }
}

export default SimplexNoise;
