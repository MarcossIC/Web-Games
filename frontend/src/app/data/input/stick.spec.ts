import { idleStickPush, stickPush } from './stick';

describe('stickPush', () => {
  it('is centred where the finger landed', () => {
    const push = stickPush({ isDown: true, x: 50, y: 80, downX: 50, downY: 80 }, 30, idleStickPush());

    expect(push).toEqual({ dx: 0, dy: 0, knobX: 50, knobY: 80 });
  });

  it('follows the finger inside its radius', () => {
    const push = stickPush({ isDown: true, x: 60, y: 70, downX: 50, downY: 80 }, 30, idleStickPush());

    expect(push).toEqual({ dx: 10, dy: -10, knobX: 60, knobY: 70 });
  });

  it('keeps the knob on its rim when the finger goes further, but reports the whole push', () => {
    const push = stickPush({ isDown: true, x: 150, y: 80, downX: 50, downY: 80 }, 30, idleStickPush());

    expect(push.dx).toBe(100);
    expect(push.knobX).toBe(80);
    expect(push.knobY).toBe(80);
  });

  it('fills the push it was given', () => {
    const out = idleStickPush();
    expect(stickPush({ isDown: true, x: 0, y: 0, downX: 0, downY: 0 }, 30, out)).toBe(out);
  });
});
