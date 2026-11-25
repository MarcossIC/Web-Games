import { measure } from './difficulty';
import { LEVELS } from './levels';
import type { LevelSpec } from './types';

describe('Ring Out difficulty', () => {
  it('finds nothing in the way on a board where each piece only waits for the clips', () => {
    // Level 7, a small tree: start from the leaves. Order, but no knot.
    const stats = measure(LEVELS[6], LEVELS[6].solution);
    expect(stats.blocked).toBe(0);
    expect(stats.involved).toBe(0);
    expect(stats.share).toBe(0);
  });

  it('counts every piece of the dominoes as part of the puzzle', () => {
    // Level 13: each rod waits for the next one, and the rings for the rods.
    const stats = measure(LEVELS[12], LEVELS[12].solution);
    expect(stats.pieces).toBe(5);
    expect(stats.blocked).toBe(4);
    expect(stats.share).toBe(1);
    expect(stats.looseRods).toEqual([]);
  });

  it('counts a turn that takes nothing off as one that makes room', () => {
    // Level 9: the blue ring turns aside for the bent rod.
    expect(measure(LEVELS[8], LEVELS[8].solution).setups).toBe(1);
    expect(measure(LEVELS[0], LEVELS[0].solution).setups).toBe(0);
  });

  it('does not count a closed ring among the pieces that move', () => {
    // Level 3: a closed ring holds three.
    expect(measure(LEVELS[2], LEVELS[2].solution).pieces).toBe(3);
  });

  it('names the rods that take no part', () => {
    // Level 4, with a rod far away that nothing waits for.
    const level: LevelSpec = {
      ...LEVELS[3],
      rods: [...(LEVELS[3].rods ?? []), { tail: [0, 300], head: [150, 300], color: 'pink' }],
      solution: [...LEVELS[3].solution, { rod: 1 }],
    };
    const stats = measure(level, level.solution);
    expect(stats.looseRods).toEqual([1]);
  });

  it('refuses a solution that does not play', () => {
    expect(() => measure(LEVELS[0], [{ ring: 0, turn: 90 }])).toThrowError(/Move 1/);
  });
});
