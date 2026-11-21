import { TurnQueue, headingTurn, swipeTurn } from './steering';

describe('swipeTurn', () => {
  it('waits until the finger has moved far enough', () => {
    expect(swipeTurn(10, -12, 22)).toBeNull();
  });

  it('follows the axis the finger moved most along', () => {
    expect(swipeTurn(40, 10)).toBe('d');
    expect(swipeTurn(-40, 10)).toBe('a');
    expect(swipeTurn(5, 30)).toBe('s');
    expect(swipeTurn(5, -30)).toBe('w');
  });
});

describe('headingTurn', () => {
  it('names the way the snake moves', () => {
    expect(headingTurn(1, 0)).toBe('d');
    expect(headingTurn(-1, 0)).toBe('a');
    expect(headingTurn(0, 1)).toBe('s');
    expect(headingTurn(0, -1)).toBe('w');
  });
});

describe('TurnQueue', () => {
  it('gives one turn per step, in order', () => {
    const queue = new TurnQueue();
    queue.push('w', 'd');
    queue.push('a', 'd');

    expect(queue.take()).toBe('w');
    expect(queue.take()).toBe('a');
    expect(queue.take()).toBeUndefined();
  });

  it('ignores going on the same way or straight back', () => {
    const queue = new TurnQueue();

    expect(queue.push('d', 'd')).toBeFalse();
    expect(queue.push('a', 'd')).toBeFalse();
    expect(queue.push('w', 'd')).toBeTrue();
    // Judged against the turn already waiting, not the old heading.
    expect(queue.push('s', 'd')).toBeFalse();
  });

  it('keeps no more than two turns waiting', () => {
    const queue = new TurnQueue();
    queue.push('w', 'd');
    queue.push('a', 'd');

    expect(queue.push('s', 'd')).toBeFalse();
  });
});
