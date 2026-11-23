import { TurnQueue, headingTurn } from './steering';

// swipeTurn moved to the input core as swipeDirection: its cases are in
// data/input/swipe.spec.ts.

describe('headingTurn', () => {
  it('names the way the snake moves', () => {
    expect(headingTurn(1, 0)).toBe('right');
    expect(headingTurn(-1, 0)).toBe('left');
    expect(headingTurn(0, 1)).toBe('down');
    expect(headingTurn(0, -1)).toBe('up');
  });
});

describe('TurnQueue', () => {
  it('gives one turn per step, in order', () => {
    const queue = new TurnQueue();
    queue.push('up', 'right');
    queue.push('left', 'right');

    expect(queue.take()).toBe('up');
    expect(queue.take()).toBe('left');
    expect(queue.take()).toBeUndefined();
  });

  it('ignores going on the same way or straight back', () => {
    const queue = new TurnQueue();

    expect(queue.push('right', 'right')).toBeFalse();
    expect(queue.push('left', 'right')).toBeFalse();
    expect(queue.push('up', 'right')).toBeTrue();
    // Judged against the turn already waiting, not the old heading.
    expect(queue.push('down', 'right')).toBeFalse();
  });

  it('keeps no more than two turns waiting', () => {
    const queue = new TurnQueue();
    queue.push('up', 'right');
    queue.push('left', 'right');

    expect(queue.push('down', 'right')).toBeFalse();
  });
});
