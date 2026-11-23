import * as Phaser from 'phaser';
import { BreakerTexture, PaddleArt, TEXTURE_SCALE } from '@app/data/models/breaker/BreakerKeys';
import type { BreakerState } from '../engine/types';
import { paddleTextureKey } from './looks';
import { DEPTH } from './scene-kit';
import { lerp, squash } from './view-math';

const PAD = PaddleArt.GLOW_PAD;
const CAP = PaddleArt.CAP_WIDTH;
const KEYS = [BreakerTexture.PADDLE, BreakerTexture.PADDLE_LASER, BreakerTexture.PADDLE_MAGNET] as const;
const SQUASH_MS = 180;
/** Game over: how long the paddle shakes and swells before it bursts. */
export const PADDLE_OVERLOAD_MS = 460;
/** Time between two crackles while it overloads. */
const CRACKLE_EVERY_MS = 55;

/** What the paddle's death sets off around it (the reactor's effects and sounds). */
export interface PaddleDeathFx {
  /** Every few frames while it overloads: `t` goes 0 -> 1. */
  crackle(x: number, y: number, w: number, t: number): void;
  /** Once, the moment it bursts. */
  blast(x: number, y: number, w: number): void;
}

/** How the paddle is drawn: a NineSlice on WebGL, three images on Canvas. */
interface PaddleSkin {
  setKey(key: string): void;
  /** x center, y center, body width in art px, scale factors (squash times art scale), alpha. */
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

/** The paddle: interpolated x, width eased by the engine, squash on hits, an overload and a blast at game over. */
export class PaddleView {
  private readonly skin: PaddleSkin;
  private squashMs = SQUASH_MS;
  private downMs = -1;
  private nextCrackleMs = 0;
  private death: PaddleDeathFx | null = null;
  private blown = false;
  /** Drawn center, for effects that start on the paddle. */
  x = 0;
  y = 0;
  /** Drawn body width. */
  w = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    const canvas = scene.sys.renderer.type === Phaser.CANVAS;
    this.skin = canvas ? new ThreeImageSkin(scene, layer) : new NineSliceSkin(scene, layer);
  }

  /** A ball hit it: flatten and spring back. */
  hit(): void {
    this.squashMs = 0;
  }

  /**
   * Game over: the paddle overloads (it shakes harder and harder, swells and
   * flickers while it crackles), then bursts and is gone. `fx` hears both.
   */
  overload(fx: PaddleDeathFx): void {
    if (this.downMs >= 0) return;
    this.downMs = 0;
    this.nextCrackleMs = 0;
    this.death = fx;
    this.blown = false;
  }

  /** It burst: nothing left to draw. */
  get destroyed(): boolean {
    return this.blown;
  }

  sync(state: BreakerState, dtMs: number): void {
    const p = state.paddle;
    this.skin.setKey(paddleTextureKey(state.effects));
    this.x = lerp(p.prevX, p.x, state.alpha);
    this.y = p.y + p.h / 2;
    this.w = p.w;

    if (this.squashMs < SQUASH_MS) this.squashMs += dtMs * state.timeScale;
    const s = squash(this.squashMs / SQUASH_MS);
    let sx = s.x;
    let sy = s.y;
    let alpha = 1;
    let shakeX = 0;
    let shakeY = 0;

    if (this.downMs >= 0) {
      this.downMs += dtMs;
      if (this.downMs < PADDLE_OVERLOAD_MS) {
        const t = this.downMs / PADDLE_OVERLOAD_MS;
        // Shakes harder and harder, swells, and flickers faster as it nears the blast.
        const amp = 1 + 5 * t * t;
        shakeX = (Math.random() * 2 - 1) * amp;
        shakeY = (Math.random() * 2 - 1) * amp * 0.5;
        sx *= 1 + 0.1 * t;
        sy *= 1 + 0.55 * t;
        alpha = Math.sin(this.downMs * (0.04 + 0.22 * t)) > -0.3 ? 1 : 0.35;
        if (this.downMs >= this.nextCrackleMs) {
          this.nextCrackleMs = this.downMs + CRACKLE_EVERY_MS;
          this.death?.crackle(this.x, this.y, p.w, t);
        }
      } else {
        alpha = 0;
        if (!this.blown) {
          this.blown = true;
          this.death?.blast(this.x, this.y, p.w);
          this.death = null;
        }
      }
    }
    // The art is painted for an 18 px body; a taller paddle (a phone held
    // upright) scales it evenly, caps and glow included, and slices k times
    // fewer texture px so the body still comes out p.w wide.
    const k = p.h / PaddleArt.BODY_HEIGHT;
    this.skin.draw(this.x + shakeX, this.y + shakeY, p.w / k, sx * k, sy * k, alpha);
  }
}
