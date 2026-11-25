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
 *   the screen. The world sits over a deck for the thumbs, so no thumb
 *   covers the run, and the rows left above it are sky.
 * - overlay (a phone on its side): there is no height to spare for a deck.
 *   The canvas takes the shape of the screen, so it shows more of the world
 *   across, and the thumbs play over its bottom corners.
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
/** Narrower than this the thumbs over the picture would leave too little to see. */
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

/** A key on the screen, or a part of it a finger acts on. */
export interface TouchButton {
  /** Where a finger presses it: bigger than what is drawn. */
  readonly zone: Rect;
  /** What is drawn: for the stick and the jump, where their hint rests. */
  readonly face: Rect;
}

/**
 * What a touch screen is played with. There are no keys to find: the left
 * half is a stick that floats under the thumb wherever it lands, the right
 * half jumps wherever it is touched. Pause is the one key.
 */
export interface TouchControls {
  readonly pause: TouchButton;
  /** The left half: slide sideways to run, up to jump, down to crouch. */
  readonly stick: TouchButton;
  /** The right half, under pause: touch to jump, hold for a higher one. */
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
  /** The panel under the view the thumbs rest on, where there is room. */
  readonly deck: Rect | null;
  /** How fingers play on the screen; none with a keyboard. */
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

/** The two halves of the canvas: the stick on the left, the jump on the right under pause. */
function halves(width: number, height: number, stickFace: Rect, jumpFace: Rect): TouchControls {
  const middle = Math.round(width / 2);
  return {
    pause: pauseKey(width),
    stick: { face: stickFace, zone: { x: 0, y: 0, w: middle, h: height } },
    jump: { face: jumpFace, zone: { x: middle, y: PAUSE_ZONE, w: width - middle, h: height - PAUSE_ZONE } },
  };
}

/**
 * On the deck the hints rest in the middle of each half of it. A thumb can
 * land anywhere on its half, the picture above included.
 */
function deckControls(width: number, height: number, deck: Rect): TouchControls {
  // A little above the middle: the last rows hold the label of the deck.
  const middle = deck.y + Math.round(deck.h / 2) - 6;
  const size = 84;
  const at = (cx: number): Rect => ({ x: Math.round(cx - size / 2), y: middle - size / 2, w: size, h: size });
  return halves(width, height, at(width / 4), at((width * 3) / 4));
}

/**
 * Over the picture the hints rest in the bottom corners, where the thumbs
 * of a phone held on its side are.
 */
function cornerControls(width: number, height: number): TouchControls {
  const bottom = height - 14;
  const stick: Rect = { x: 16, y: bottom - 80, w: 80, h: 80 };
  const jump: Rect = { x: width - 16 - 64, y: bottom - 64, w: 64, h: 64 };
  return halves(width, height, stick, jump);
}

/** How far a resting thumb covers the picture past its hint. */
const THUMB_COVER_LEFT = 40;
const THUMB_COVER_RIGHT = 72;

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
    controls: deckControls(width, height, deck),
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

  // The thumbs cover the ground at both corners. The band the player rests
  // in ends far enough from the right thumb to see what a desktop shows
  // ahead, without getting under the left one, and never right of where it
  // would rest with nothing in the way.
  const leftThumbEnd = controls.stick.face.x + controls.stick.face.w + THUMB_COVER_LEFT;
  const restsUntil = clamp(
    controls.jump.face.x - THUMB_COVER_RIGHT - GROUND_AHEAD,
    leftThumbEnd + 10 + cameraDeadzone,
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
