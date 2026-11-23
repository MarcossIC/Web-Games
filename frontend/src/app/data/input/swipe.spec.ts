import { SWIPE_MIN_PX, SwipeTracker, swipeDirection } from './swipe';

describe('swipeDirection', () => {
  it('waits until the finger has moved far enough', () => {
    expect(swipeDirection(10, -12, 22)).toBeNull();
  });

  it('follows the axis the finger moved most along', () => {
    expect(swipeDirection(40, 10)).toBe('right');
    expect(swipeDirection(-40, 10)).toBe('left');
    expect(swipeDirection(5, 30)).toBe('down');
    expect(swipeDirection(5, -30)).toBe('up');
  });

  it('needs 22 px by default', () => {
    expect(SWIPE_MIN_PX).toBe(22);
    expect(swipeDirection(21, 0)).toBeNull();
    expect(swipeDirection(22, 0)).toBe('right');
  });
});

describe('SwipeTracker', () => {
  const finger = (id: number, x: number, y: number) => ({ id, x, y, type: 'touch' });

  it('turns once the finger has gone far enough', () => {
    const swipes = new SwipeTracker();
    swipes.down(finger(1, 100, 100));
    expect(swipes.move(finger(1, 110, 100))).toBeNull();
    expect(swipes.move(finger(1, 130, 100))).toBe('right');
  });

  it('starts again from where the last turn was taken, so one stroke draws a path', () => {
    const swipes = new SwipeTracker();
    swipes.down(finger(1, 100, 100));
    expect(swipes.move(finger(1, 130, 100))).toBe('right');
    // 30 px right of the start, but only 5 from the turn: not yet.
    expect(swipes.move(finger(1, 130, 105))).toBeNull();
    expect(swipes.move(finger(1, 130, 140))).toBe('down');
    expect(swipes.move(finger(1, 100, 140))).toBe('left');
  });

  it('leaves the mouse out: a mouse is steered with the keyboard', () => {
    const swipes = new SwipeTracker();
    swipes.down({ id: 1, x: 100, y: 100, type: 'mouse' });
    expect(swipes.move({ id: 1, x: 200, y: 100, type: 'mouse' })).toBeNull();
  });

  it('follows the finger that went down last', () => {
    const swipes = new SwipeTracker();
    swipes.down(finger(1, 100, 100));
    swipes.down(finger(2, 0, 0));
    expect(swipes.move(finger(1, 100, 140))).toBeNull();
    expect(swipes.move(finger(2, 100, 0))).toBe('right');
  });

  it('forgets the finger once it is lifted or cancelled', () => {
    const swipes = new SwipeTracker();
    swipes.down(finger(1, 100, 100));
    swipes.up(finger(1, 100, 100));
    expect(swipes.move(finger(1, 200, 100))).toBeNull();

    swipes.down(finger(1, 100, 100));
    swipes.up(finger(2, 100, 100));
    expect(swipes.move(finger(1, 200, 100))).toBe('right');
  });

  it('takes the distance it is given', () => {
    const swipes = new SwipeTracker(50);
    swipes.down(finger(1, 0, 0));
    expect(swipes.move(finger(1, 40, 0))).toBeNull();
    expect(swipes.move(finger(1, 50, 0))).toBe('right');
  });
});
