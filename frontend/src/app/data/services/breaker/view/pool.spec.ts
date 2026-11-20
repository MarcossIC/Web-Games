import { Pool } from './pool';

interface Item {
  id: number;
  on: boolean;
}

describe('Pool', () => {
  let made: number;
  let pool: Pool<Item>;

  beforeEach(() => {
    made = 0;
    pool = new Pool<Item>(
      3,
      () => ({ id: made++, on: false }),
      (item) => (item.on = true),
      (item) => (item.on = false)
    );
  });

  it('builds every item up front', () => {
    expect(made).toBe(3);
    expect(pool.size).toBe(3);
    expect(pool.activeCount).toBe(0);
  });

  it('hands out free items and calls onAcquire', () => {
    const a = pool.acquire();
    expect(a).not.toBeNull();
    expect(a!.on).toBeTrue();
    expect(pool.activeCount).toBe(1);
  });

  it('returns null when exhausted instead of growing (no allocation in the loop)', () => {
    pool.acquire();
    pool.acquire();
    pool.acquire();
    expect(pool.acquire()).toBeNull();
    expect(made).toBe(3);
  });

  it('takes items back and reuses them', () => {
    const a = pool.acquire()!;
    pool.release(a);
    expect(a.on).toBeFalse();
    expect(pool.activeCount).toBe(0);
    const b = pool.acquire();
    expect(b).toBe(a);
  });

  it('ignores a double release', () => {
    const a = pool.acquire()!;
    pool.release(a);
    pool.release(a);
    expect(pool.activeCount).toBe(0);
    pool.acquire();
    pool.acquire();
    pool.acquire();
    expect(pool.acquire()).toBeNull();
  });

  it('releaseAll frees everything', () => {
    pool.acquire();
    pool.acquire();
    pool.releaseAll();
    expect(pool.activeCount).toBe(0);
    expect(pool.items.every((item) => !item.on)).toBeTrue();
  });

  it('knows whether an item is out', () => {
    const a = pool.acquire()!;
    expect(pool.isActive(a)).toBeTrue();
    pool.release(a);
    expect(pool.isActive(a)).toBeFalse();
  });
});
