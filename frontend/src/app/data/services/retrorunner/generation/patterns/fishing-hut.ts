import { HUT_SHORE_CENTER_TILES } from '../balance';
import { FLOOR_SURFACE_ABOVE_Y, HUT, TILE } from '../geometry';
import { jumpReach } from '../jump-model';
import { PatternPlanner } from './pattern';

/**
 * A house at the end of a shore, its dock on stilts over the water. The
 * player climbs the stairs, crosses the house floor and the dock, and
 * jumps from the dock's end to the landing.
 *
 *        ┌──────┐
 *       /│ house│═════════╗   ← planks: house floor + dock (HUT.DECK_TOP)
 *  ____/_│______│ ╳ ║    ║  ║
 *  shore        ╲ ║ water  ║   landing
 *
 * The stairs and the house's base stand on the shore; only the stilts
 * reach into the water. Everything stays at the floor's height, so the
 * shore continues the floor before it with no step.
 */
export const fishingHut: PatternPlanner = (draft) => {
  const floorY = draft.entryY;
  const surfaceY = floorY - FLOOR_SURFACE_ABOVE_Y;

  // The shore's edge falls between the house's base and the first stilt.
  const shore = draft.ground(HUT_SHORE_CENTER_TILES, floorY);
  const hutX = shore.endX + TILE.END_WIDTH - HUT.SHORE_EDGE;
  const hutY = surfaceY - HUT.BASE_BOTTOM;
  const deckY = hutY + HUT.DECK_TOP;
  draft.add({ type: 'hut', x: hutX, y: hutY });

  // The planks: the house floor and the whole dock, one body with no seams.
  draft.platform(hutX + HUT.STAIRS_TOP, deckY, HUT.WIDTH - HUT.STAIRS_TOP, 8);
  // The house's base, from the planks down to the shore: the player goes up
  // the stairs, not through the house.
  draft.platform(hutX + HUT.STAIRS_TOP, deckY, HUT.BASE_RIGHT - HUT.STAIRS_TOP, HUT.BASE_BOTTOM - HUT.DECK_TOP);
  // One step halfway up the stairs.
  const stepHeight = Math.round((HUT.BASE_BOTTOM - HUT.DECK_TOP) / 2);
  draft.platform(hutX + HUT.STAIRS_BOTTOM, surfaceY - stepHeight, HUT.STAIRS_TOP - HUT.STAIRS_BOTTOM, stepHeight);

  // The jump from the dock's end to the landing.
  const dockEndX = hutX + HUT.WIDTH;
  draft.x = dockEndX + draft.rng.terrain.intBetween(100, 140);

  // Water from the shore's end tile to under the landing's first tile.
  draft.add({
    type: 'water',
    x: shore.endX,
    y: surfaceY + 2,
    width: draft.x + TILE.END_WIDTH - shore.endX,
  });

  const hole = draft.x - dockEndX;
  draft.ground(4, floorY);
  return { exitY: floorY, cost: hole / jumpReach(surfaceY - deckY) };
};
