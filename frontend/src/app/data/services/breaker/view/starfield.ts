/**
 * The background stars: positions in typed arrays, drifting down at a
 * speed that grows with their depth (near stars are faster, bigger and
 * brighter), so a few dozen sprites read as parallax. Pure: the view copies
 * x/y onto its images.
 */
export class Starfield {
  readonly x: Float32Array;
  readonly y: Float32Array;
  /** px/s */
  readonly speed: Float32Array;
  /** 0 (far) .. 1 (near). */
  readonly depth: Float32Array;
  private seed: number;

  constructor(
    readonly count: number,
    private readonly width: number,
    private readonly height: number,
    seed: number
  ) {
    this.seed = seed >>> 0 || 1;
    this.x = new Float32Array(count);
    this.y = new Float32Array(count);
    this.speed = new Float32Array(count);
    this.depth = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const depth = this.random();
      this.depth[i] = depth;
      this.speed[i] = 6 + depth * depth * 34;
      this.x[i] = this.random() * width;
      this.y[i] = this.random() * height;
    }
  }

  update(dtMs: number, timeScale: number): void {
    const dt = (dtMs * timeScale) / 1000;
    for (let i = 0; i < this.count; i++) {
      let y = this.y[i] + this.speed[i] * dt;
      if (y > this.height) {
        y %= this.height;
        this.x[i] = this.random() * this.width;
      }
      this.y[i] = y;
    }
  }

  /** xorshift32, so the field is the same for a seed and costs nothing. */
  private random(): number {
    let s = this.seed;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    this.seed = s >>> 0;
    return this.seed / 4294967296;
  }
}
