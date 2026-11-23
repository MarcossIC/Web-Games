import { TapTracker } from './tap';

describe('TapTracker', () => {
  const buttons = [
    { key: 'resume', x: 0, y: 0, w: 100, h: 40 },
    { key: 'exit', x: 0, y: 50, w: 100, h: 40 },
  ] as const;
  type Key = (typeof buttons)[number]['key'];

  const hit = (x: number, y: number): Key | null =>
    buttons.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)?.key ?? null;

  let taps: TapTracker<Key>;

  beforeEach(() => {
    taps = new TapTracker<Key>(hit);
  });

  it('is a tap when the finger goes down and comes up on the same button', () => {
    taps.down(1, 50, 20);

    expect(taps.up(1, 60, 25)).toBe('resume');
  });

  it('is not a tap when the finger slides off before coming up', () => {
    taps.down(1, 50, 20);

    expect(taps.up(1, 50, 200)).toBeNull();
  });

  it('is not a tap when the finger comes up on another button', () => {
    taps.down(1, 50, 20);

    expect(taps.up(1, 50, 70)).toBeNull();
  });

  it('is not a tap when the finger went down somewhere else', () => {
    taps.down(1, 50, 200);

    expect(taps.up(1, 50, 20)).toBeNull();
  });

  it('shows a button as pressed only while a finger that started on it is down', () => {
    expect(taps.isPressed('exit')).toBeFalse();

    taps.down(1, 50, 70);
    expect(taps.isPressed('exit')).toBeTrue();
    expect(taps.isPressed('resume')).toBeFalse();

    taps.up(1, 50, 70);
    expect(taps.isPressed('exit')).toBeFalse();
  });

  it('follows each finger on its own', () => {
    taps.down(1, 50, 20);
    taps.down(2, 50, 70);

    expect(taps.up(2, 50, 70)).toBe('exit');
    expect(taps.up(1, 50, 20)).toBe('resume');
  });

  it('forgets every finger when asked, so a redrawn screen starts clean', () => {
    taps.down(1, 50, 20);

    taps.clear();

    expect(taps.isPressed('resume')).toBeFalse();
    expect(taps.up(1, 50, 20)).toBeNull();
  });
});
