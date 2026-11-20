/**
 * A fixed-size object pool. Every item is built in the constructor (in a
 * scene's create()), so acquiring and releasing in the frame loop never
 * allocates. When it runs dry it answers null: an effect is skipped rather
 * than growing the pool mid-game.
 */
export class Pool<T> {
  readonly items: readonly T[];
  private readonly free: number[] = [];
  private readonly out: boolean[] = [];
  private readonly index = new Map<T, number>();

  constructor(
    size: number,
    create: (index: number) => T,
    private readonly onAcquire?: (item: T) => void,
    private readonly onRelease?: (item: T) => void
  ) {
    const items: T[] = [];
    for (let i = 0; i < size; i++) {
      const item = create(i);
      items.push(item);
      this.index.set(item, i);
      this.out.push(false);
    }
    // Free stack popped from the end: the first item comes out first.
    for (let i = size - 1; i >= 0; i--) this.free.push(i);
    this.items = items;
  }

  get size(): number {
    return this.items.length;
  }

  get activeCount(): number {
    return this.items.length - this.free.length;
  }

  acquire(): T | null {
    const i = this.free.pop();
    if (i === undefined) return null;
    this.out[i] = true;
    const item = this.items[i];
    this.onAcquire?.(item);
    return item;
  }

  release(item: T): void {
    const i = this.index.get(item);
    if (i === undefined || !this.out[i]) return;
    this.out[i] = false;
    this.free.push(i);
    this.onRelease?.(item);
  }

  isActive(item: T): boolean {
    const i = this.index.get(item);
    return i !== undefined && this.out[i];
  }

  releaseAll(): void {
    for (let i = 0; i < this.items.length; i++) {
      if (this.out[i]) this.release(this.items[i]);
    }
  }
}
