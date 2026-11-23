import { contains, heldZones, type Zone } from './zones';

type Key = 'left' | 'right';

const zones: readonly Zone<Key>[] = [
  { key: 'left', rect: { x: 0, y: 0, w: 50, h: 50 } },
  { key: 'right', rect: { x: 40, y: 0, w: 50, h: 50 } },
];

const idle = (): Record<Key, boolean> => ({ left: false, right: false });

describe('contains', () => {
  it('takes the top-left edge and leaves out the bottom-right one', () => {
    const rect = { x: 10, y: 10, w: 10, h: 10 };
    expect(contains(rect, 10, 10)).toBeTrue();
    expect(contains(rect, 19.9, 19.9)).toBeTrue();
    expect(contains(rect, 20, 15)).toBeFalse();
    expect(contains(rect, 15, 20)).toBeFalse();
  });
});

describe('heldZones', () => {
  it('holds the zone under a finger that is down', () => {
    expect(heldZones(zones, [{ isDown: true, x: 10, y: 10 }], idle())).toEqual({ left: true, right: false });
  });

  it('ignores a finger that is up', () => {
    expect(heldZones(zones, [{ isDown: false, x: 10, y: 10 }], idle())).toEqual(idle());
  });

  it('gives a finger to the first zone that has it, where two overlap', () => {
    expect(heldZones(zones, [{ isDown: true, x: 45, y: 10 }], idle())).toEqual({ left: true, right: false });
  });

  it('holds one zone per finger', () => {
    const fingers = [
      { isDown: true, x: 10, y: 10 },
      { isDown: true, x: 80, y: 10 },
    ];
    expect(heldZones(zones, fingers, idle())).toEqual({ left: true, right: true });
  });

  it('starts from nothing every time: a zone is let go once its finger leaves', () => {
    const out = idle();
    heldZones(zones, [{ isDown: true, x: 10, y: 10 }], out);
    expect(heldZones(zones, [{ isDown: true, x: 80, y: 10 }], out)).toEqual({ left: false, right: true });
  });

  it('holds nothing without zones, and fills the state it was given', () => {
    const out = { left: true, right: true };
    expect(heldZones(null, [{ isDown: true, x: 10, y: 10 }], out)).toBe(out);
    expect(out).toEqual(idle());
  });
});
