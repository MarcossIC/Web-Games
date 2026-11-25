import { Board } from './board';
import { radians } from './geometry';
import type { LevelSpec } from './types';

/** Two rings: 0 holds a clip on 1, whose opening faces down. */
const PAIR: LevelSpec = {
  rings: [
    { x: 0, y: 0, color: 'orange', facing: 180 },
    { x: 124, y: 0, color: 'blue', facing: 90 },
  ],
  clips: [{ from: 0, on: 1 }],
  solution: [{ ring: 1, turn: 90 }],
};

/** The same pair with a rod through the opening of ring 1, sliding right. */
const PINNED: LevelSpec = {
  rings: [
    { x: 0, y: 0, color: 'orange', facing: 180 },
    { x: 124, y: 0, color: 'blue', facing: 0 },
  ],
  clips: [{ from: 0, on: 1 }],
  rods: [{ tail: [146, 0], head: [294, 0], color: 'green' }],
  solution: [{ rod: 0 }, { ring: 1, turn: 180 }],
};

describe('Ring Out board', () => {
  it('puts the clip on the held ring, facing the ring that holds it', () => {
    const board = Board.load(PAIR);
    const clip = board.clips[0];
    expect(clip.at).toBeCloseTo(Math.PI, 6);
    expect(clip.sleeve.x).toBeCloseTo(74, 6);
    expect(clip.weld.x).toBeCloseTo(50, 6);
  });

  it('does not let a ring turn while it holds a clip', () => {
    const board = Board.load(PAIR);
    expect(board.canTurn(0)).toBeFalse();
    expect(board.turnRange(0)).toEqual({ min: 0, max: 0 });
    const outcome = board.turn(0, radians(90));
    expect(outcome.turned).toBe(0);
    expect(outcome.blocked).toBeTrue();
  });

  it('turns a ring with nothing in the way as far as it is asked', () => {
    const board = Board.load(PAIR);
    const range = board.turnRange(1);
    expect(range.min).toBe(-Infinity);
    expect(range.max).toBe(Infinity);
    const outcome = board.turn(1, radians(20));
    expect(outcome.turned).toBeCloseTo(radians(20), 9);
    expect(outcome.blocked).toBeFalse();
    expect(outcome.events).toEqual([]);
  });

  it('lets the clip go when the opening reaches it, and breaks both rings', () => {
    const board = Board.load(PAIR);
    const outcome = board.turn(1, radians(90));
    expect(outcome.events.map((e) => e.kind)).toEqual(['release', 'shatter', 'shatter']);
    expect(board.clips[0].alive).toBeFalse();
    expect(board.rings.every((r) => !r.alive)).toBeTrue();
    expect(board.cleared).toBeTrue();
    // It stopped where it broke, before the end of the quarter turn.
    expect(outcome.turned).toBeLessThan(radians(90));
  });

  it('lets the clip go turning the other way as well', () => {
    const board = Board.load(PAIR);
    const outcome = board.turn(1, radians(-270));
    expect(outcome.events[0].kind).toBe('release');
    expect(board.cleared).toBeTrue();
  });

  it('stops a ring at a rod in its opening', () => {
    const board = Board.load(PINNED);
    const range = board.turnRange(1);
    expect(range.max).toBeGreaterThan(0);
    expect(range.max).toBeLessThan(radians(45));
    expect(range.min).toBeCloseTo(-range.max, 6);
    const outcome = board.turn(1, radians(180));
    expect(outcome.blocked).toBeTrue();
    expect(outcome.turned).toBeCloseTo(range.max, 9);
    expect(board.clips[0].alive).toBeTrue();
  });

  it('pulls a rod with a clear way out of its clamp, and then the ring is free', () => {
    const board = Board.load(PINNED);
    const plan = board.slidePlan(0);
    expect(plan.free).toBeTrue();
    expect(plan.distance).toBeCloseTo(board.rods[0].exitDistance, 9);
    expect(board.pullRod(0).events.map((e) => e.kind)).toEqual(['rod-out']);
    expect(board.turnRange(1).max).toBe(Infinity);
  });

  it('stops a rod at the first thing in its way', () => {
    // The rod slides left, into the tube of ring 1 (its opening faces down).
    const board = Board.load({ ...PAIR, rods: [{ tail: [294, 0], head: [190, 0], color: 'green' }] });
    const plan = board.slidePlan(0);
    expect(plan.free).toBeFalse();
    // Its head at 190 stops where it touches the tube at 174 (+ half a tube each, + room).
    expect(plan.distance).toBeGreaterThan(0);
    expect(plan.distance).toBeLessThan(190 - 174);
    expect(board.pullRod(0).events).toEqual([]);
    expect(board.rods[0].alive).toBeTrue();
  });

  it('finds the piece under a point', () => {
    const board = Board.load(PINNED);
    expect(board.pieceAt({ x: 0, y: -50 }, 4)).toEqual({ kind: 'ring', id: 0 });
    expect(board.pieceAt({ x: 250, y: 2 }, 4)).toEqual({ kind: 'rod', id: 0 });
    // Inside a ring, away from its tube, is that ring.
    expect(board.pieceAt({ x: 110, y: 20 }, 4)).toEqual({ kind: 'ring', id: 1 });
    expect(board.pieceAt({ x: 60, y: 200 }, 4)).toBeNull();
  });

  it('keeps a clone apart from the board it came from', () => {
    const board = Board.load(PAIR);
    const copy = board.clone();
    copy.turn(1, radians(90));
    expect(copy.cleared).toBeTrue();
    expect(board.cleared).toBeFalse();
    expect(board.rings[1].angle).toBeCloseTo(radians(90), 9);
  });

  it('counts what is left and says when the board is cleared', () => {
    const board = Board.load(PINNED);
    expect(board.remaining).toBe(3);
    board.pullRod(0);
    expect(board.remaining).toBe(2);
    board.turn(1, radians(180));
    expect(board.remaining).toBe(0);
    expect(board.cleared).toBeTrue();
  });
});
