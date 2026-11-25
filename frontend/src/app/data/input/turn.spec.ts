import { TurnTracker } from './turn';

const CENTER = { x: 100, y: 100 };

/** A point at `radius` from the center, `deg` degrees clockwise from the right. */
function at(deg: number, radius = 50) {
  const a = (deg * Math.PI) / 180;
  return { x: CENTER.x + radius * Math.cos(a), y: CENTER.y + radius * Math.sin(a) };
}

describe('TurnTracker', () => {
  it('adds up the angle swept clockwise', () => {
    const turn = new TurnTracker();
    turn.down(1, at(0), CENTER, 0);
    turn.move(1, at(30));
    expect(turn.move(1, at(90))).toBeCloseTo(Math.PI / 2, 9);
  });

  it('reads counter-clockwise as negative', () => {
    const turn = new TurnTracker();
    turn.down(1, at(0), CENTER, 0);
    expect(turn.move(1, at(-45))).toBeCloseTo(-Math.PI / 4, 9);
  });

  it('keeps counting past half a turn and a whole one', () => {
    const turn = new TurnTracker();
    turn.down(1, at(0), CENTER, 0);
    let swept = 0;
    for (let deg = 20; deg <= 400; deg += 20) swept = turn.move(1, at(deg)) ?? NaN;
    expect(swept).toBeCloseTo((400 * Math.PI) / 180, 9);
  });

  it('does not count moves too close to the center', () => {
    const turn = new TurnTracker({ deadZonePx: 10 });
    turn.down(1, at(0), CENTER, 0);
    turn.move(1, at(10));
    // Through the middle: the angle there means nothing.
    expect(turn.move(1, { x: CENTER.x + 1, y: CENTER.y - 2 })).toBeCloseTo((10 * Math.PI) / 180, 9);
    expect(turn.move(1, at(20))).toBeCloseTo((20 * Math.PI) / 180, 9);
  });

  it('tells a tap from a turn', () => {
    const turn = new TurnTracker();
    turn.down(1, at(0), CENTER, 0);
    turn.move(1, { x: at(0).x + 2, y: at(0).y });
    expect(turn.up(1, 120)).toBe('tap');

    turn.down(2, at(0), CENTER, 0);
    turn.move(2, at(40));
    expect(turn.up(2, 120)).toBe('turn');

    turn.down(3, at(0), CENTER, 0);
    expect(turn.up(3, 2000)).toBe('turn');
  });

  it('ignores pointers that are not the one turning', () => {
    const turn = new TurnTracker();
    turn.down(1, at(0), CENTER, 0);
    expect(turn.move(2, at(90))).toBeNull();
    expect(turn.up(2, 10)).toBeNull();
    expect(turn.active).toBeTrue();
    turn.cancel(1);
    expect(turn.active).toBeFalse();
    expect(turn.up(1, 10)).toBeNull();
  });
});
