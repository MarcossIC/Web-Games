import { TrailRing } from './trail-ring';

describe('TrailRing', () => {
  it('keeps the last N positions, newest first', () => {
    const ring = new TrailRing(3);
    ring.push(1, 10);
    ring.push(2, 20);
    expect(ring.count).toBe(2);
    expect(ring.xAt(0)).toBe(2);
    expect(ring.yAt(0)).toBe(20);
    expect(ring.xAt(1)).toBe(1);
    ring.push(3, 30);
    ring.push(4, 40);
    expect(ring.count).toBe(3);
    expect(ring.xAt(0)).toBe(4);
    expect(ring.xAt(2)).toBe(2);
  });

  it('starts over when the ball jumps (a new serve, a split), so no streak crosses the screen', () => {
    const ring = new TrailRing(4, 50);
    ring.push(100, 100);
    ring.push(104, 100);
    ring.push(400, 600);
    expect(ring.count).toBe(1);
    expect(ring.xAt(0)).toBe(400);
  });

  it('can be cleared', () => {
    const ring = new TrailRing(2);
    ring.push(1, 1);
    ring.clear();
    expect(ring.count).toBe(0);
  });
});
