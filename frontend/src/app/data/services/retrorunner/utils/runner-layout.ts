import type { Rect } from '@app-input';

/**
 * The shape of the picture, decided from the screen it is shown on.
 *
 * The world never changes: it is 330 rows tall with the floor near its
 * bottom, and every jump is planned for it. What changes is how much is
 * seen around it and where the fingers go:
 *
 * - desktop: the 550 by 330 picture of always, played with the keyboard.
 * - deck (a phone held upright, a tablet): the canvas takes the shape of
 *   the screen. The world sits over a deck that holds the keys, so no thumb
 *   covers the run, and the rows left above it are sky.
 * - overlay (a phone on its side): there is no height to spare for a deck.
 *   The canvas takes the shape of the screen, so it shows more of the world
 *   across, and the keys are drawn over its bottom corners.
 */

/** Rows of the world. The floor is 16 px above the last one. */
export const WORLD_HEIGHT = 330;
/** Width of the picture on a desktop. */
export const DESKTOP_WIDTH = 550;
/**
 * Width of the narrowest canvas: the one of a phone held upright. On a
 * 390 px wide phone a game pixel is a little over one CSS pixel, so the
 * capybara is about as wide as a fingertip; with the player resting at 30%
 * of it the view shows as far ahead as the desktop one.
 */
export const NARROW_WIDTH = 360;

/**
 * On a touch screen a game pixel is never drawn bigger than this many CSS
 * pixels. A phone is far under it; a tablet would draw a giant capybara and
 * keys as big as a hand, so it gets a bigger canvas: more world in sight.
 */
const MAX_PIXEL_SIZE = 1.6;
/** A screen longer than this for its width keeps empty bars: more sky adds nothing. */
const DECK_MAX_RATIO = 860 / 360;
/** Ground kept in sight ahead of the resting player: what a desktop shows. */
const GROUND_AHEAD = 240;
/** The deck takes this much of an upright canvas, between two limits. */
const DECK_SHARE = 0.3;
/** Under this there is no room for a key a thumb can find. */
const DECK_MIN_HEIGHT = 140;
const DECK_MAX_HEIGHT = 260;
/** Narrower than this the keys over the picture would leave too little to see. */
const WIDE_MIN_WIDTH = 480;
/** Wider than this the player sees so far ahead that nothing is a surprise. */
const WIDE_MAX_WIDTH = 800;

/** The pause key: what is drawn, and the corner a finger can hit. */
const PAUSE_FACE = 28;
const PAUSE_MARGIN = 6;
const PAUSE_ZONE = 44;

/** Registry key of the layout in use; `layoutOf` reads it. */
export const RUNNER_LAYOUT = 'runner-layout';
/** Emitted on the game's events when the layout changes: (next, previous). */
export const LAYOUT_CHANGED = 'runner-layout-changed';

export type LayoutMode = 'desktop' | 'deck' | 'overlay';

export { contains, type Rect } from '@app-input';

/** A key on the screen. */
export interface TouchButton {
  /** Where a finger presses it: bigger than what is drawn. */
  readonly zone: Rect;
  /** The key that is drawn. */
  readonly face: Rect;
}

export interface TouchControls {
  readonly pause: TouchButton;
  readonly left: TouchButton;
  readonly right: TouchButton;
  readonly crouch: TouchButton;
  readonly jump: TouchButton;
}

export interface RunnerLayout {
  readonly mode: LayoutMode;
  /** The canvas, in game pixels. */
  readonly width: number;
  readonly height: number;
  /**
   * Rows of the canvas the world is drawn in, from its top. The world's
   * last row is the last of them: what is left above the world is sky.
   */
  readonly viewHeight: number;
  /** The panel under the view that holds the keys, where there is room. */
  readonly deck: Rect | null;
  /** The keys on the screen; none with a keyboard. */
  readonly controls: TouchControls | null;
  /** Where across the view the player rests: 0.5 is the middle. */
  readonly cameraAnchor: number;
  /** Width of the band the player moves in without dragging the camera. */
  readonly cameraDeadzone: number;
}

export const DESKTOP_LAYOUT: RunnerLayout = {
  mode: 'desktop',
  width: DESKTOP_WIDTH,
  height: WORLD_HEIGHT,
  viewHeight: WORLD_HEIGHT,
  deck: null,
  controls: null,
  cameraAnchor: 0.5,
  cameraDeadzone: 80,
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

function pauseKey(width: number): TouchButton {
  return {
    zone: { x: width - PAUSE_ZONE, y: 0, w: PAUSE_ZONE, h: PAUSE_ZONE },
    face: { x: width - PAUSE_MARGIN - PAUSE_FACE, y: PAUSE_MARGIN, w: PAUSE_FACE, h: PAUSE_FACE },
  };
}

/**
 * The keys on the deck. The deck is split in four columns, one per key,
 * from edge to edge and from top to bottom: a thumb that lands a little off
 * its key still presses it, and sliding from one arrow to the other turns
 * around without lifting the finger.
 */
function deckControls(width: number, deck: Rect): TouchControls {
  // A little above the middle: the last rows hold the label of the deck.
  const middle = deck.y + Math.round(deck.h / 2) - 6;
  const key = (x: number, size: number): Rect => ({ x, y: middle - size / 2, w: size, h: size });
  const column = (from: number, to: number): Rect => ({ x: from, y: deck.y, w: to - from, h: deck.h });

  const left = key(12, 72);
  const right = key(left.x + left.w + 8, 72);
  const jump = key(width - 12 - 88, 88);
  const crouch = key(jump.x - 8 - 56, 56);

  // Each column ends half way to the next key.
  const leftEnd = (left.x + left.w + right.x) / 2;
  const rightEnd = (right.x + right.w + crouch.x) / 2;
  const crouchEnd = (crouch.x + crouch.w + jump.x) / 2;

  return {
    pause: pauseKey(width),
    left: { face: left, zone: column(0, leftEnd) },
    right: { face: right, zone: column(leftEnd, rightEnd) },
    crouch: { face: crouch, zone: column(rightEnd, crouchEnd) },
    jump: { face: jump, zone: column(crouchEnd, width) },
  };
}

/**
 * The keys over the bottom corners of the picture. Each is pressed from an
 * area that reaches the edges of the canvas and well above the key.
 */
function cornerControls(width: number, height: number): TouchControls {
  const bottom = height - 14;
  const reach = 40;
  const key = (x: number, size: number): Rect => ({ x, y: bottom - size, w: size, h: size });
  const area = (face: Rect, from: number, to: number): Rect => ({
    x: from,
    y: face.y - reach,
    w: to - from,
    h: height - (face.y - reach),
  });

  const left = key(16, 56);
  const right = key(left.x + left.w + 8, 56);
  const jump = key(width - 16 - 64, 64);
  const crouch = key(jump.x - 10 - 48, 48);

  const leftEnd = (left.x + left.w + right.x) / 2;
  const crouchEnd = (crouch.x + crouch.w + jump.x) / 2;

  return {
    pause: pauseKey(width),
    left: { face: left, zone: area(left, 0, leftEnd) },
    right: { face: right, zone: area(right, leftEnd, right.x + right.w + 24) },
    crouch: { face: crouch, zone: area(crouch, crouch.x - 14, crouchEnd) },
    jump: { face: jump, zone: area(jump, crouchEnd, width) },
  };
}

function deckLayout(width: number, height: number): RunnerLayout {
  const deckHeight = clamp(
    Math.round(height * DECK_SHARE),
    DECK_MIN_HEIGHT,
    Math.min(DECK_MAX_HEIGHT, height - WORLD_HEIGHT)
  );
  const viewHeight = height - deckHeight;
  const deck: Rect = { x: 0, y: viewHeight, w: width, h: deckHeight };
  const cameraDeadzone = 48;
  return {
    mode: 'deck',
    width,
    height,
    viewHeight,
    deck,
    controls: deckControls(width, deck),
    // Nothing covers the view: the player rests as far left as it takes to
    // see the ground ahead that a desktop shows, and no further.
    cameraAnchor: clamp((width - GROUND_AHEAD - cameraDeadzone / 2) / width, 0.3, 0.42),
    cameraDeadzone,
  };
}

/** `rows` is the height of the canvas: the world's, or more on a big screen. */
function overlayLayout(aspect: number, rows: number): RunnerLayout {
  const width = clamp(Math.round(rows * aspect), WIDE_MIN_WIDTH, WIDE_MAX_WIDTH);
  const height = Math.max(WORLD_HEIGHT, Math.round(width / aspect));
  const controls = cornerControls(width, height);
  const cameraDeadzone = 80;

  // The keys cover the ground at both corners. The band the player rests in
  // ends far enough from the right keys to see what a desktop shows ahead,
  // without getting under the arrows, and never right of where it would
  // rest with nothing in the way.
  const arrowsEnd = controls.right.face.x + controls.right.face.w;
  const restsUntil = clamp(
    controls.crouch.zone.x - GROUND_AHEAD,
    arrowsEnd + 10 + cameraDeadzone,
    width * 0.42 + cameraDeadzone / 2
  );

  return {
    mode: 'overlay',
    width,
    height,
    viewHeight: height,
    deck: null,
    controls,
    cameraAnchor: (restsUntil - cameraDeadzone / 2) / width,
    cameraDeadzone,
  };
}

/**
 * The layout for a screen of `cssWidth` by `cssHeight` CSS pixels: the box
 * the canvas is fitted into. `touch` says the screen is played with
 * fingers (the page's CSS asks the same question to fill the screen).
 */
export function runnerLayout(cssWidth: number, cssHeight: number, touch: boolean): RunnerLayout {
  if (!touch) return DESKTOP_LAYOUT;
  // Not laid out yet: the desktop shape, with keys, until it is measured.
  if (!(cssWidth > 0) || !(cssHeight > 0)) return overlayLayout(DESKTOP_WIDTH / WORLD_HEIGHT, WORLD_HEIGHT);

  const aspect = cssWidth / cssHeight;

  // With a deck, if the world and a deck fit one above the other: the
  // narrowest canvas of this shape that keeps a game pixel small enough.
  const deckWidth = clamp(Math.round(cssWidth / MAX_PIXEL_SIZE), NARROW_WIDTH, WIDE_MAX_WIDTH);
  const deckCanvasHeight = Math.min(Math.round(deckWidth / aspect), Math.round(deckWidth * DECK_MAX_RATIO));
  if (deckCanvasHeight - WORLD_HEIGHT >= DECK_MIN_HEIGHT) return deckLayout(deckWidth, deckCanvasHeight);

  const rows = Math.max(WORLD_HEIGHT, Math.round(cssHeight / MAX_PIXEL_SIZE));
  return overlayLayout(aspect, rows);
}

/** True when both describe the same picture: nothing has to be redrawn. */
export function sameLayout(a: RunnerLayout, b: RunnerLayout): boolean {
  return a.mode === b.mode && a.width === b.width && a.height === b.height && a.viewHeight === b.viewHeight;
}

/**
 * True when the screen went from upright to its side, or back, between the
 * two layouts. A screen that only changed size (the browser hid its bars)
 * was not turned.
 */
export function wasTurned(previous: RunnerLayout, next: RunnerLayout): boolean {
  return previous.width > previous.height !== next.width > next.height;
}

/** The layout a scene draws with, read from the game's registry. */
export function layoutOf(registry: { get(key: string): unknown }): RunnerLayout {
  return (registry.get(RUNNER_LAYOUT) as RunnerLayout | undefined) ?? DESKTOP_LAYOUT;
}

/** Where a line of the HUD goes: `originX` 0 starts at x, 1 ends at it. */
export interface HudAnchor {
  readonly x: number;
  readonly y: number;
  readonly originX: number;
}

export interface HudLayout {
  readonly score: HudAnchor;
  readonly clock: HudAnchor;
  readonly best: HudAnchor;
}

const HUD_MARGIN = 10;
const HUD_TOP = 8;
/** Under this width one line cannot hold the score, the clock and the best. */
const HUD_ONE_LINE_FROM = DESKTOP_WIDTH;

/**
 * Where the score, the clock and the best score go. A touch screen has the
 * pause key in its top right corner, so the line ends before it; a narrow
 * one stacks the score and the best and puts the clock beside the key.
 */
export function hudLayout(layout: RunnerLayout): HudLayout {
  const { width, controls } = layout;
  const score: HudAnchor = { x: HUD_MARGIN, y: HUD_TOP, originX: 0 };
  if (!controls) {
    return {
      score,
      clock: { x: width / 2, y: HUD_TOP, originX: 0.5 },
      best: { x: width - HUD_MARGIN, y: HUD_TOP, originX: 1 },
    };
  }

  const beforePause = controls.pause.zone.x - 4;
  if (width < HUD_ONE_LINE_FROM) {
    return {
      score,
      best: { x: HUD_MARGIN, y: HUD_TOP + 18, originX: 0 },
      clock: { x: beforePause, y: HUD_TOP, originX: 1 },
    };
  }
  return {
    score,
    clock: { x: width / 2, y: HUD_TOP, originX: 0.5 },
    best: { x: beforePause, y: HUD_TOP, originX: 1 },
  };
}
