import * as Phaser from 'phaser';
import { BreakerTexture, PaddleArt, TEXTURE_SCALE } from '@app/data/models/breaker/BreakerKeys';
import type { BreakerState } from '../engine/types';
import { paddleTextureKey } from './looks';
import { DEPTH } from './scene-kit';
import { clamp01, lerp, squash } from './view-math';

const PAD = PaddleArt.GLOW_PAD;
const CAP = PaddleArt.CAP_WIDTH;
const KEYS = [BreakerTexture.PADDLE, BreakerTexture.PADDLE_LASER, BreakerTexture.PADDLE_MAGNET] as const;
const SQUASH_MS = 180;
const POWER_DOWN_MS = 900;

/** How the paddle is drawn: a NineSlice on WebGL, three images on Canvas. */
interface PaddleSkin {
  setKey(key: string): void;
  /** x center, y center, body width, squash factors, alpha. */
  draw(x: number, y: number, w: number, sx: number, sy: number, alpha: number): void;
}

/**
 * WebGL: one 3-slice NineSlice per variant (plain, laser, magnet), only one
 * visible, so a variant change is a visibility flip instead of a re-slice.
 * Its width only changes when the rounded width does.
 */
class NineSliceSkin implements PaddleSkin {
  private readonly slices = new Map<string, Phaser.GameObjects.NineSlice>();
  private current: Phaser.GameObjects.NineSlice;
  private width = -1;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    for (const key of KEYS) {
      const slice = scene.add.nineslice(
        0,
        0,
        key,
        undefined,
        (PaddleArt.BASE_BODY_WIDTH + 2 * PAD) * TEXTURE_SCALE,
        0,
        CAP * TEXTURE_SCALE,
        CAP * TEXTURE_SCALE
      );
      slice.setScale(1 / TEXTURE_SCALE).setDepth(DEPTH.PADDLE).setVisible(false);
      layer.add(slice);
      this.slices.set(key, slice);
    }
    this.current = this.slices.get(BreakerTexture.PADDLE)!;
    this.current.setVisible(true);
  }

  setKey(key: string): void {
    const next = this.slices.get(key);
    if (!next || next === this.current) return;
    this.current.setVisible(false);
    this.current = next;
    this.width = -1;
    next.setVisible(true);
  }

  draw(x: number, y: number, w: number, sx: number, sy: number, alpha: number): void {
    const slice = this.current;
    const width = Math.round((w + 2 * PAD) * TEXTURE_SCALE);
    if (width !== this.width) {
      this.width = width;
      // setSize, not width: it also re-centers the display origin.
      slice.setSize(width, slice.height);
    }
    slice.setPosition(x, y);
    slice.setScale(sx / TEXTURE_SCALE, sy / TEXTURE_SCALE);
    slice.setAlpha(alpha);
  }
}

/**
 * Canvas fallback (NineSlice draws nothing there): left cap, stretched
 * middle and right cap from the frames the texture factory adds.
 */
class ThreeImageSkin implements PaddleSkin {
  private readonly left: Phaser.GameObjects.Image;
  private readonly middle: Phaser.GameObjects.Image;
  private readonly right: Phaser.GameObjects.Image;
  private key: string = BreakerTexture.PADDLE;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    const part = (frame: string, originX: number) => {
      const image = scene.add.image(0, 0, BreakerTexture.PADDLE, frame).setOrigin(originX, 0.5).setDepth(DEPTH.PADDLE);
      layer.add(image);
      return image;
    };
    this.left = part(PaddleArt.FRAMES.LEFT, 1);
    this.middle = part(PaddleArt.FRAMES.MIDDLE, 0.5);
    this.right = part(PaddleArt.FRAMES.RIGHT, 0);
  }

  setKey(key: string): void {
    if (key === this.key) return;
    this.key = key;
    this.left.setTexture(key, PaddleArt.FRAMES.LEFT);
    this.middle.setTexture(key, PaddleArt.FRAMES.MIDDLE);
    this.right.setTexture(key, PaddleArt.FRAMES.RIGHT);
  }

  draw(x: number, y: number, w: number, sx: number, sy: number, alpha: number): void {
    const total = (w + 2 * PAD) * sx;
    const capW = CAP * sx;
    const midW = Math.max(1, total - 2 * capW);
    const h = PaddleArt.HEIGHT * sy;
    this.middle.setPosition(x, y).setDisplaySize(midW, h).setAlpha(alpha);
    this.left.setPosition(x - midW / 2, y).setDisplaySize(capW, h).setAlpha(alpha);
    this.right.setPosition(x + midW / 2, y).setDisplaySize(capW, h).setAlpha(alpha);
  }
}

/** The paddle: interpolated x, width eased by the engine, squash on hits, a power-down at game over. */
export class PaddleView {
  private readonly skin: PaddleSkin;
  private squashMs = SQUASH_MS;
  private downMs = -1;
  /** Drawn center, for effects that start on the paddle. */
  x = 0;
  y = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    const canvas = scene.sys.renderer.type === Phaser.CANVAS;
    this.skin = canvas ? new ThreeImageSkin(scene, layer) : new NineSliceSkin(scene, layer);
  }

  /** A ball hit it: flatten and spring back. */
  hit(): void {
    this.squashMs = 0;
  }

  /** Game over: the paddle flickers out and sinks. */
  powerDown(): void {
    if (this.downMs < 0) this.downMs = 0;
  }

  sync(state: BreakerState, dtMs: number): void {
    const p = state.paddle;
    this.skin.setKey(paddleTextureKey(state.effects));
    this.x = lerp(p.prevX, p.x, state.alpha);
    this.y = p.y + p.h / 2;

    if (this.squashMs < SQUASH_MS) this.squashMs += dtMs * state.timeScale;
    const s = squash(this.squashMs / SQUASH_MS);

    let alpha = 1;
    let drop = 0;
    if (this.downMs >= 0) {
      this.downMs += dtMs;
      const t = clamp01(this.downMs / POWER_DOWN_MS);
      // A dying flicker first, then a fade while it sinks.
      const flicker = t < 0.45 && Math.sin(this.downMs * 0.09) > 0.2 ? 0.25 : 1;
      alpha = flicker * (1 - Math.max(0, t - 0.35) / 0.65);
      drop = t * t * 46;
    }
    this.skin.draw(this.x, this.y + drop, p.w, s.x, s.y, alpha);
  }
}
