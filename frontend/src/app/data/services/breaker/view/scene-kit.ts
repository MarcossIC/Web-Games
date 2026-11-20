import * as Phaser from 'phaser';
import { type Board, canvasHeight, DESKTOP_BOARD } from './board-layout';

/**
 * Shared bits of the Nova Breaker view: draw order, colors, fonts and the
 * two layers (world and UI), each seen by its own camera.
 */

/** Draw order inside each layer (SCENE.md, capas). */
export const DEPTH = {
  BG: 0,
  STARS: 1,
  BRICKS: 10,
  BRICK_OVERLAY: 11,
  BRICK_FLASH: 12,
  CAPSULE_GLOW: 19,
  CAPSULES: 20,
  LASERS: 21,
  BARRIER: 22,
  TRAILS: 30,
  BALLS: 31,
  PADDLE: 32,
  PARTICLES: 40,
  RINGS: 41,
  TEXTS: 50,
  EDGE_GLOW: 85,
  OVERLAY: 90,
  HUD: 100,
  HUD_TEXT: 101,
  BANNERS: 110,
} as const;

export const COLOR = {
  INK: 0x07060d,
  PANEL: 0x100e1c,
  LINE: 0x2a2540,
  MAGENTA: 0xff2e88,
  CYAN: 0x5ee6ff,
  YELLOW: 0xffe14a,
  GREEN: 0x5dfc9a,
  ORANGE: 0xff9a3d,
  VIOLET: 0xb78bff,
  RED: 0xff5c5c,
  WHITE: 0xffffff,
} as const;

export const CSS = {
  TEXT: '#ecebff',
  DIM: '#a7a1c6',
  MAGENTA: '#ff2e88',
  CYAN: '#5ee6ff',
  YELLOW: '#ffe14a',
  GREEN: '#5dfc9a',
  ORANGE: '#ff9a3d',
  RED: '#ff5c5c',
  INK: '#07060d',
} as const;

export const FONT = {
  PIXEL: 'Silkscreen, ui-monospace, monospace',
  DISPLAY: 'Audiowide, system-ui, sans-serif',
} as const;

export interface SceneLayers {
  /** Everything in the play field: the main camera sees it (it shakes and zooms). */
  world: Phaser.GameObjects.Layer;
  /** HUD, overlay and banners: a second camera that never shakes nor zooms. */
  ui: Phaser.GameObjects.Layer;
  uiCamera: Phaser.Cameras.Scene2D.Camera;
}

/**
 * The canvas is `board.extra` rows taller than the world on a tall board (the
 * HUD rows). Both cameras keep engine coordinates: the main one is pushed down
 * by `extra` (its viewport), the UI one covers the whole canvas and looks
 * `extra` px above y = 0 (its scroll), so the HUD draws at negative y and
 * nothing that is placed in engine coordinates has to know about the rows.
 */
export function createLayers(scene: Phaser.Scene, board: Board = DESKTOP_BOARD): SceneLayers {
  const world = scene.add.layer().setDepth(0);
  const ui = scene.add.layer().setDepth(1);
  const main = scene.cameras.main;
  main.setViewport(0, board.extra, scene.scale.width, board.height);
  // Bounds keep the slow-motion zoom from ever showing past the world's edge.
  main.setBounds(0, 0, scene.scale.width, board.height);
  const uiCamera = scene.cameras.add(0, 0, scene.scale.width, canvasHeight(board), false, 'breaker-ui');
  uiCamera.setScroll(0, -board.extra);
  main.ignore(ui);
  uiCamera.ignore(world);
  return { world, ui, uiCamera };
}
