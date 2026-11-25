/**
 * Sizes of the pieces, in board units. A level is laid out in these units
 * and the view scales the whole board to the screen.
 */

/** Radius of a ring, to the middle of its tube. */
export const RING_RADIUS = 50;
/** Thickness of a ring's tube, and of a rod. */
export const TUBE = 12;
/** Width of the opening of a ring, in degrees, when a level does not say. */
export const DEFAULT_GAP = 100;

/** Thickness of the arm between a ring and its clip. */
export const ARM = 7;
/** Length of a clip along the tube it is closed around. */
export const CLIP_LENGTH = 20;
/** Width of a clip across that tube. */
export const CLIP_WIDTH = 20;

/** Length of a rod's clamp along the rod. */
export const CLAMP_LENGTH = 24;
/** Width of a clamp across the rod. */
export const CLAMP_WIDTH = 28;

/** Room kept between two pieces that touch: they stop this far apart. */
export const CLEARANCE = 0.75;
/** Pieces are checked at points this far apart along them. */
export const SAMPLE_STEP = 3;

/** A rod slides this much further once it is out of its clamp, while it breaks. */
export const ROD_EXIT_OVERSHOOT = 18;
