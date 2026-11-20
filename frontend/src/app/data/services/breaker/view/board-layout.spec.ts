import { worldLayout } from '../engine/config';
import {
  BOARD_EXTRA_TALL,
  boardFor,
  canvasHeight,
  DESKTOP_BOARD,
  hudZoneAt,
  isTallBoard,
  NOVA_BUTTON,
  PAUSE_BUTTON,
  viewMetrics,
} from './board-layout';

describe('boardFor (what the parent element decides at boot)', () => {
  it('keeps the desktop 960x720 for a landscape or square parent', () => {
    expect(boardFor(1280, 720)).toEqual(DESKTOP_BOARD);
    expect(boardFor(800, 800)).toEqual(DESKTOP_BOARD);
  });

  it('keeps the desktop board when the parent has no size yet', () => {
    expect(boardFor(0, 0)).toEqual(DESKTOP_BOARD);
    expect(boardFor(Number.NaN, 800)).toEqual(DESKTOP_BOARD);
    expect(boardFor(400, Number.POSITIVE_INFINITY)).toEqual(DESKTOP_BOARD);
  });

  it('makes the whole canvas match a portrait phone, and gives the HUD its extra rows out of that height', () => {
    const board = boardFor(390, 844);
    expect(isTallBoard(board)).toBeTrue();
    expect(board.extra).toBe(BOARD_EXTRA_TALL);
    // 960 * 844 / 390 = 2077.7: canvas and parent keep the same shape, so FIT leaves no bars.
    expect(canvasHeight(board)).toBe(2078);
    expect(board.height).toBe(2078 - BOARD_EXTRA_TALL);
  });

  it('clamps a very tall parent to the engine ceiling', () => {
    const board = boardFor(360, 1200);
    expect(board.height).toBe(worldLayout(10_000).height);
  });

  it('a barely portrait parent still gets at least the desktop height', () => {
    const board = boardFor(1000, 1001);
    expect(board.height).toBeGreaterThanOrEqual(720);
  });

  it('desktop has no extra rows', () => {
    expect(DESKTOP_BOARD).toEqual({ height: 720, extra: 0 });
    expect(canvasHeight(DESKTOP_BOARD)).toBe(720);
    expect(isTallBoard(DESKTOP_BOARD)).toBeFalse();
  });
});

describe('hudZoneAt (taps on the HUD never reach the paddle)', () => {
  const cx = (r: { x: number; w: number }) => r.x + r.w / 2;
  const cy = (r: { y: number; h: number }) => r.y + r.h / 2;

  it('finds the two buttons and the rest of the band', () => {
    expect(hudZoneAt(cx(PAUSE_BUTTON), cy(PAUSE_BUTTON), true)).toBe('pause');
    expect(hudZoneAt(cx(NOVA_BUTTON), cy(NOVA_BUTTON), true)).toBe('nova');
    expect(hudZoneAt(40, -80, true)).toBe('band');
    expect(hudZoneAt(40, 30, true)).toBe('band');
  });

  it('is empty from the ceiling down: the play field belongs to the paddle', () => {
    expect(hudZoneAt(480, 64, true)).toBeNull();
    expect(hudZoneAt(480, 900, true)).toBeNull();
  });

  it('does not exist on the desktop board', () => {
    expect(hudZoneAt(cx(PAUSE_BUTTON), cy(PAUSE_BUTTON), false)).toBeNull();
    expect(hudZoneAt(40, 30, false)).toBeNull();
  });

  it('buttons are thumb sized on a 390 px phone (>= 44 CSS px)', () => {
    const scale = 390 / 960;
    for (const b of [PAUSE_BUTTON, NOVA_BUTTON]) {
      expect(b.w * scale).toBeGreaterThanOrEqual(44);
      expect(b.h * scale).toBeGreaterThanOrEqual(44);
    }
  });

  it('the buttons do not overlap and live inside the extra rows', () => {
    expect(PAUSE_BUTTON.x).toBeGreaterThanOrEqual(NOVA_BUTTON.x + NOVA_BUTTON.w);
    for (const b of [PAUSE_BUTTON, NOVA_BUTTON]) {
      expect(b.y).toBeGreaterThanOrEqual(-BOARD_EXTRA_TALL);
      expect(b.y + b.h).toBeLessThanOrEqual(0);
    }
  });
});

describe('viewMetrics (where the bottom-anchored view pieces go)', () => {
  it('reproduces the desktop constants on the desktop board', () => {
    const m = viewMetrics(DESKTOP_BOARD, worldLayout(720));
    expect(m.bannerY).toBe(330);
    expect(m.novaFloatY).toBe(360);
    expect(m.hintY).toBe(612);
    expect(m.cardY).toBe(360);
    expect(m.effectsY).toBe(702);
    expect(m.bannerScale).toBe(1);
    expect(m.hintScale).toBe(1);
  });

  it('follows the paddle in a tall world and never goes into the thumb room', () => {
    const board = boardFor(390, 844);
    const layout = worldLayout(board.height);
    const m = viewMetrics(board, layout);
    expect(m.bannerY).toBeLessThan(layout.paddleY);
    expect(m.hintY).toBeLessThan(layout.paddleY);
    expect(m.cardY).toBe(layout.height / 2);
    expect(m.bannerScale).toBeGreaterThan(1);
    expect(m.hintScale).toBeGreaterThan(1);
    // Everything bottom-anchored stays above the paddle's bottom edge.
    expect(m.effectsY).toBeLessThan(layout.paddleY);
  });
});
