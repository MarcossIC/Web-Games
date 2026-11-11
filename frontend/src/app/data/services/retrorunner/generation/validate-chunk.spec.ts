import { BiomeType, ChunkPlan, Piece } from './chunk-plan';
import { floorRunEnd } from './geometry';
import { validateChunk } from './validate-chunk';

const FLOOR_Y = 314;

function plan(overrides: Partial<ChunkPlan>): ChunkPlan {
  return {
    index: 1,
    attempt: 0,
    startX: 0,
    endX: 0,
    entryY: FLOOR_Y,
    exitY: FLOOR_Y,
    biome: BiomeType.PLAINS,
    kind: 'ground',
    pattern: null,
    cost: 0,
    pieces: [],
    carry: { hardStreak: 0, lastObstacleX: 0, lastTreeX: 0, lastLargeDecoX: 0 },
    ...overrides,
  };
}

/** A chunk of plain ground: one run of floor at the height it starts at. */
function ground(previous: ChunkPlan | null, centerTiles: number, y = previous?.exitY ?? FLOOR_Y): ChunkPlan {
  const startX = previous?.endX ?? 0;
  return plan({
    index: previous ? previous.index + 1 : 0,
    startX,
    endX: floorRunEnd(startX, centerTiles),
    entryY: previous?.exitY ?? FLOOR_Y,
    exitY: y,
    pieces: [{ type: 'floor', x: startX, y, centerTiles }],
  });
}

/** A hole `width` px wide from the end of the floor before. */
function gap(previous: ChunkPlan, width: number, exitY = previous.exitY): ChunkPlan {
  return plan({
    index: previous.index + 1,
    kind: 'gap',
    startX: previous.endX,
    endX: previous.endX + width,
    entryY: previous.exitY,
    exitY,
  });
}

describe('validateChunk', () => {
  const first = ground(null, 6);

  it('accepts plain ground that continues the chunk before', () => {
    expect(validateChunk(first, null)).toEqual([]);
    expect(validateChunk(ground(first, 4), first)).toEqual([]);
  });

  it('accepts the widest gap the generator asks for', () => {
    expect(validateChunk(gap(first, 200), first)).toEqual([]);
  });

  it('rejects a gap wider than the jump allows', () => {
    expect(validateChunk(gap(first, 300), first)).toContain(jasmine.stringMatching(/cannot be reached/));
  });

  it('accepts the floor a gap promised, where it promised it', () => {
    const hole = gap(first, 150, FLOOR_Y - 20);
    expect(validateChunk(ground(hole, 4), hole)).toEqual([]);
  });

  it('rejects a chunk after a gap that does not start where the gap promised', () => {
    const hole = gap(first, 150);
    const late = plan({
      index: hole.index + 1,
      startX: hole.endX,
      endX: floorRunEnd(hole.endX + 60, 3),
      pieces: [{ type: 'floor', x: hole.endX + 60, y: FLOOR_Y, centerTiles: 3 }],
    });
    expect(validateChunk(late, hole)).toContain(jasmine.stringMatching(/landing/));
  });

  describe('a long hole with blocks over it', () => {
    // Base floor, four blocks 35 to 70 px up and a landing: 318 px of hole,
    // more than one jump, less than one jump between any two of them.
    const base = floorRunEnd(first.endX, 2);
    const blocks: Piece[] = [
      { type: 'block', x: base + 40, y: FLOOR_Y - 50 },
      { type: 'block', x: base + 108, y: FLOOR_Y - 70 },
      { type: 'block', x: base + 178, y: FLOOR_Y - 40 },
      { type: 'block', x: base + 248, y: FLOOR_Y - 60 },
    ];
    const landingX = base + 333;
    const chain = (withBlocks: boolean) =>
      plan({
        index: 1,
        kind: 'pattern',
        startX: first.endX,
        endX: floorRunEnd(landingX, 4),
        pieces: [
          { type: 'floor', x: first.endX, y: FLOOR_Y, centerTiles: 2 },
          ...(withBlocks ? blocks : []),
          { type: 'floor', x: landingX, y: FLOOR_Y, centerTiles: 4 },
        ],
      });

    it('accepts it when the blocks carry the player across', () => {
      expect(validateChunk(chain(true), first)).toEqual([]);
    });

    it('rejects it without the blocks', () => {
      expect(validateChunk(chain(false), first)).toContain(jasmine.stringMatching(/cannot be reached/));
    });
  });

  it('rejects a step higher than the jump', () => {
    const wall = ground(first, 4, FLOOR_Y - 200);
    expect(validateChunk(wall, first)).toContain(jasmine.stringMatching(/cannot be reached/));
  });

  it('rejects a chunk that does not continue the one before', () => {
    const apart = plan({ ...ground(first, 4), startX: first.endX + 10 });
    expect(validateChunk(apart, first)).toContain(jasmine.stringMatching(/chunk before ends at/));

    const lower = plan({ ...ground(first, 4), entryY: FLOOR_Y + 5 });
    expect(validateChunk(lower, first)).toContain(jasmine.stringMatching(/chunk before ends at height/));
  });

  it('rejects a chunk that does not end on a floor at its exit height', () => {
    const wrongExit = plan({ ...ground(first, 4), exitY: FLOOR_Y - 30 });
    expect(validateChunk(wrongExit, first)).toContain(jasmine.stringMatching(/does not end on a floor/));
  });

  it('rejects ground that reaches out of its chunk', () => {
    const outside = ground(first, 4);
    outside.pieces.push({ type: 'block', x: outside.endX + 100, y: FLOOR_Y - 60 });
    expect(validateChunk(outside, first)).toContain(jasmine.stringMatching(/outside its chunk/));
  });
});
