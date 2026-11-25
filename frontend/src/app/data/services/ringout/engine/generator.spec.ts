import { Board } from './board';
import { measure } from './difficulty';
import { clears, generateStage, stageRecipe, STAGE_OF_FULL_SIZE, type GeneratedStage } from './generator';
import { levelProblems } from './validate';

/**
 * The boards of Infinite never ship unproven: each one checked here is
 * drawn without overlaps, cleared by the way it carries, and tangled
 * enough to be a puzzle. The first stages, and a few far on.
 */
const STAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, STAGE_OF_FULL_SIZE, 41];

describe('Ring Out generator', () => {
  STAGES.forEach((stage) => {
    describe(`stage ${stage}`, () => {
      // Built once for its checks, while they run rather than while they are listed.
      let built: GeneratedStage;
      beforeAll(() => (built = generateStage(stage)));

      it('is drawn without overlaps or loose pieces', () => {
        expect(levelProblems(built.level)).toEqual([]);
      });

      it('is cleared by the way it carries, every move going all the way', () => {
        expect(built.level.solution.length).toBeGreaterThan(0);
        expect(clears(built.level, built.level.solution)).toBeTrue();
      });

      it('has its pieces in each other\'s way, and no rod that takes no part', () => {
        expect(built.fallback).withContext('fell back to a level made by hand').toBeFalse();
        const stats = measure(built.level, built.level.solution);
        expect(stats.share).toBeGreaterThanOrEqual(0.5);
        expect(stats.blocked).toBeGreaterThanOrEqual(1);
        expect(stats.looseRods).toEqual([]);
      });

      it('fits on the screen like the levels made by hand', () => {
        const b = Board.load(built.level).bounds();
        const [long, short] = [b.maxX - b.minX, b.maxY - b.minY].sort((x, y) => y - x);
        expect(long).toBeLessThanOrEqual(760);
        expect(short).toBeLessThanOrEqual(600);
      });
    });
  });

  it('builds the same board for the same stage', () => {
    expect(JSON.stringify(generateStage(7).level)).toBe(JSON.stringify(generateStage(7).level));
    expect(JSON.stringify(generateStage(7).level)).not.toBe(JSON.stringify(generateStage(8).level));
  });

  it('asks for more as the stages go on, and stops growing at full size', () => {
    const first = stageRecipe(1);
    const full = stageRecipe(STAGE_OF_FULL_SIZE);
    expect(full.rings + full.rods).toBeGreaterThan(first.rings + first.rods);
    expect(full.minShare).toBeGreaterThan(first.minShare);
    expect(full.target).toBeGreaterThan(first.target);
    const later = stageRecipe(STAGE_OF_FULL_SIZE + 50);
    expect(later.rings + later.rods).toBe(full.rings + full.rods);
  });

  it('builds bigger and harder boards far on than at the start', () => {
    const early = generateStage(1);
    const far = generateStage(STAGE_OF_FULL_SIZE);
    expect(far.stats.pieces).toBeGreaterThan(early.stats.pieces);
    expect(far.difficulty).toBeGreaterThan(early.difficulty);
  });
});
