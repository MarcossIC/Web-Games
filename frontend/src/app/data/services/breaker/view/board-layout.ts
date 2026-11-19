import { WORLD, type WorldLayout, worldLayout } from '../engine/config';

/**
 * The shape of the canvas, decided once at boot from the parent element.
 *
 * `height` is the engine's world (width is always 960). `extra` are rows ABOVE
 * the world that only the UI camera draws: on a phone held upright the HUD has
 * to be ~2.5x bigger to be readable, and 2.5x of the 64 px band neither fits
 * nor leaves room for two thumb-sized buttons. The canvas is `height + extra`
 * tall, so engine coordinates never change (the grid, the boss and the ceiling
 * stay top-anchored) and the main camera simply starts `extra` px lower.
 */
export interface Board {
  readonly height: number;
  readonly extra: number;
}

export const DESKTOP_BOARD: Board = { height: WORLD.HEIGHT, extra: 0 };

/** Rows above the world on a tall board: two HUD rows with the buttons. */
export const BOARD_EXTRA_TALL = 136;

/**
 * HUD text and the launch hint on a tall board. On a 390 px wide phone the
 * display scale is ~0.4: 11 px labels would be ~4.5 CSS px, at 2.5x they are
 * ~11 CSS px, and the 22 px numbers ~22.
 */
export const TOUCH_UI_SCALE = 2.5;

/** Sector banners and the sector card: width bound (a 440 px card x2 is 880 of 960). */
export const TOUCH_BANNER_SCALE = 2;

export function isTallBoard(board: Board): boolean {
  return board.extra > 0;
}

export function canvasHeight(board: Board): number {
  return board.height + board.extra;
}

/**
 * Portrait parent: the canvas takes the parent's shape (960 x round(960 *
 * cssH / cssW)), so Scale.FIT fills the screen with no bars, and the HUD rows
 * come out of that height. Anything else (landscape, square, not measured
 * yet) is the desktop 960x720.
 */
export function boardFor(cssWidth: number, cssHeight: number): Board {
  if (!(cssWidth > 0) || !Number.isFinite(cssHeight) || !(cssHeight > cssWidth)) return DESKTOP_BOARD;
  const total = Math.round((WORLD.WIDTH * cssHeight) / cssWidth);
  // worldLayout owns the [720, 2080] clamp: one place for it.
  return { height: worldLayout(total - BOARD_EXTRA_TALL).height, extra: BOARD_EXTRA_TALL };
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * The two HUD buttons, in UI coordinates (y 0 = the top of the world, so the
 * extra rows are negative). 116 world px is 47 CSS px on a 390 px phone.
 */
export const PAUSE_BUTTON: Rect = { x: 828, y: -126, w: 116, h: 116 };
export const NOVA_BUTTON: Rect = { x: 586, y: -126, w: 230, h: 116 };

export type HudZone = 'pause' | 'nova' | 'band';

const inside = (r: Rect, x: number, y: number): boolean => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/**
 * What a press at (x, uiY) lands on, null when it belongs to the play field.
 * Only a tall board has a touch HUD; the whole band (extra rows + the 64 px
 * band) counts, so a tap near a button never steers nor launches.
 */
export function hudZoneAt(x: number, uiY: number, tall: boolean): HudZone | null {
  if (!tall || uiY >= WORLD.CEILING_Y) return null;
  if (inside(PAUSE_BUTTON, x, uiY)) return 'pause';
  if (inside(NOVA_BUTTON, x, uiY)) return 'nova';
  return 'band';
}

export interface ViewMetrics {
  /** Sector banner, centered. */
  bannerY: number;
  /** The NOVA float that pops when Overdrive starts. */
  novaFloatY: number;
  hintY: number;
  cardY: number;
  /** Row of the timed-effect read-outs. */
  effectsY: number;
  /** Bottom edge of the combo read-out. */
  comboY: number;
  bannerScale: number;
  hintScale: number;
}

/**
 * Where the bottom-anchored pieces of the view go. Desktop returns the legacy
 * constants (330, 360, 612, 702, 712); a tall world moves what hung from the
 * paddle with it, and puts the read-outs that lived under the paddle (the
 * thumb room now) in the strip between the HUD and the first brick row.
 */
export function viewMetrics(board: Board, layout: WorldLayout): ViewMetrics {
  const tall = isTallBoard(board);
  const shift = (layout.paddleY - 664) / 2;
  return {
    bannerY: 330 + shift,
    novaFloatY: 360 + shift,
    hintY: layout.paddleY - 52,
    cardY: layout.height / 2,
    effectsY: tall ? 84 : 702,
    comboY: tall ? 100 : 712,
    bannerScale: tall ? TOUCH_BANNER_SCALE : 1,
    hintScale: tall ? TOUCH_UI_SCALE : 1,
  };
}
