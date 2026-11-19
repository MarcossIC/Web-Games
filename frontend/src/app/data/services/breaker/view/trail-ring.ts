/**
 * The last few drawn positions of one ball, in typed arrays: pushing never
 * allocates. A jump longer than `maxJump` (a serve, a split) restarts it.
 */
export class TrailRing {
  private readonly xs: Float32Array;
  private readonly ys: Float32Array;
  private head = -1;
  private filled = 0;

  constructor(
    readonly capacity: number,
    private readonly maxJump = 80
  ) {
    this.xs = new Float32Array(capacity);
    this.ys = new Float32Array(capacity);
  }

  get count(): number {
    return this.filled;
  }

  push(x: number, y: number): void {
    if (this.filled > 0) {
      const dx = x - this.xs[this.head];
      const dy = y - this.ys[this.head];
      if (dx * dx + dy * dy > this.maxJump * this.maxJump) this.clear();
    }
    this.head = (this.head + 1) % this.capacity;
    this.xs[this.head] = x;
    this.ys[this.head] = y;
    if (this.filled < this.capacity) this.filled++;
  }

  /** 0 is the newest. */
  xAt(i: number): number {
    return this.xs[this.slot(i)];
  }

  yAt(i: number): number {
    return this.ys[this.slot(i)];
  }

  clear(): void {
    this.head = -1;
    this.filled = 0;
  }

  private slot(i: number): number {
    return (((this.head - i) % this.capacity) + this.capacity) % this.capacity;
  }
}
