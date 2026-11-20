import { followScroll, lerpForDelta, snapToScroll } from './camera-smoothing';

describe('lerpForDelta', () => {
  const FRAME_60 = 1000 / 60;

  /** Fraction of the distance still left after following for `ms`. */
  const leftAfter = (ms: number, hz: number): number => {
    const frame = 1000 / hz;
    const frames = Math.round(ms / frame);
    return Math.pow(1 - lerpForDelta(0.1, frame), frames);
  };

  it('keeps the tuned value on a 60 fps frame', () => {
    expect(lerpForDelta(0.1, FRAME_60)).toBeCloseTo(0.1, 6);
  });

  it('covers the same distance in the same time at any frame rate', () => {
    const at60 = leftAfter(500, 60);
    expect(leftAfter(500, 144)).toBeCloseTo(at60, 2);
    expect(leftAfter(500, 30)).toBeCloseTo(at60, 2);
  });

  it('does not move on a frame that took no time', () => {
    expect(lerpForDelta(0.1, 0)).toBe(0);
  });

  it('never overshoots, however long the frame', () => {
    expect(lerpForDelta(0.1, 10_000)).toBeLessThanOrEqual(1);
    expect(lerpForDelta(1, FRAME_60)).toBe(1);
  });
});

describe('followScroll', () => {
  const VIEW = 550;
  const ZONE = 80;
  /** The zone is centred: its edges, for a camera at 0. */
  const LEFT = (VIEW - ZONE) / 2;
  const RIGHT = (VIEW + ZONE) / 2;

  it('stays put while the target is inside the dead zone', () => {
    expect(followScroll(100, 100 + LEFT + 1, VIEW, ZONE, 0.5)).toBe(100);
    expect(followScroll(100, 100 + RIGHT - 1, VIEW, ZONE, 0.5)).toBe(100);
  });

  it('covers a fraction of what the target is past the right edge', () => {
    expect(followScroll(0, RIGHT + 20, VIEW, ZONE, 0.5)).toBeCloseTo(10, 6);
    expect(followScroll(0, RIGHT + 20, VIEW, ZONE, 1)).toBeCloseTo(20, 6);
  });

  it('follows to the left as well', () => {
    expect(followScroll(300, 300 + LEFT - 20, VIEW, ZONE, 0.5)).toBeCloseTo(290, 6);
  });

  it('never scrolls before the start of the world', () => {
    expect(followScroll(5, 0, VIEW, ZONE, 1)).toBe(0);
  });

  describe('with the dead zone off centre (a narrow view looks ahead)', () => {
    const NARROW = 360;
    const ANCHOR = 0.3;
    /** The zone is centred on 30% of the view: its edges, for a camera at 0. */
    const NARROW_LEFT = NARROW * ANCHOR - ZONE / 2;
    const NARROW_RIGHT = NARROW * ANCHOR + ZONE / 2;

    it('rests while the target is inside the zone around the anchor', () => {
      expect(followScroll(100, 100 + NARROW_LEFT + 1, NARROW, ZONE, 0.5, ANCHOR)).toBe(100);
      expect(followScroll(100, 100 + NARROW_RIGHT - 1, NARROW, ZONE, 0.5, ANCHOR)).toBe(100);
    });

    it('follows as soon as the target passes the zone, long before the middle of the view', () => {
      expect(followScroll(0, NARROW_RIGHT + 20, NARROW, ZONE, 0.5, ANCHOR)).toBeCloseTo(10, 6);
      expect(NARROW_RIGHT + 20).toBeLessThan(NARROW / 2);
    });

    it('puts the target on the edge of the zone at once with a full step', () => {
      const scroll = followScroll(0, 900, NARROW, ZONE, 1, ANCHOR);

      expect(900 - scroll).toBeCloseTo(NARROW_RIGHT, 6);
    });
  });
});

describe('snapToScroll', () => {
  it('lands on a whole pixel of the screen', () => {
    const x = snapToScroll(1234.56, 1000);
    expect(Number.isInteger(x - 1000)).toBe(true);
    expect(Math.abs(x - 1234.56)).toBeLessThanOrEqual(0.5);
  });

  it('keeps an object that travels with the camera still on the screen', () => {
    // The camera trails the player by a constant, fractional distance.
    // Rounding each one on its own would make the player flicker a pixel.
    const onScreen = new Set<number>();
    for (let frame = 0; frame < 200; frame++) {
      const camera = frame * 3.17;
      const player = camera + 343.7;
      const scroll = Math.round(camera);
      onScreen.add(snapToScroll(player, camera, scroll) - scroll);
    }
    expect(onScreen.size).toBe(1);
  });
});
