import * as Phaser from 'phaser';
import {
  BallArt,
  BreakerTexture,
  breakerTextureSpecs,
  brickTextureKey,
  capsuleTextureKey,
  effectIconKey,
  PaddleArt,
  TEXTURE_SCALE,
} from '@app/data/models/breaker/BreakerKeys';
import { drawTextureSheet, generateBreakerTextures } from './texture-factory';

interface Booted {
  scene: Phaser.Scene;
  destroy(): Promise<void>;
}

/** A real Phaser game on the Canvas renderer with no audio, its loop asleep. */
function bootScene(): Promise<Booted> {
  return new Promise((resolve) => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    let game: Phaser.Game;

    const destroy = () =>
      new Promise<void>((done) => {
        game.events.once(Phaser.Core.Events.DESTROY, () => {
          parent.remove();
          done();
        });
        game.destroy(true);
        game.loop.wake();
      });

    class Harness extends Phaser.Scene {
      constructor() {
        super('breaker-texture-test');
      }

      create() {
        game.loop.sleep();
        resolve({ scene: this, destroy });
      }
    }

    game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent,
      width: 960,
      height: 720,
      banner: false,
      audio: { noAudio: true },
      scene: Harness,
    });
  });
}

describe('generateBreakerTextures', () => {
  let booted: Booted;
  let textures: Phaser.Textures.TextureManager;

  beforeAll(async () => {
    booted = await bootScene();
    textures = booted.scene.textures;
    generateBreakerTextures(booted.scene);
  });

  afterAll(async () => {
    await booted.destroy();
  });

  const alphaAt = (key: string, x: number, y: number) => textures.getPixelAlpha(Math.floor(x), Math.floor(y), key);

  it('lists every key once', () => {
    const keys = breakerTextureSpecs().map((spec) => spec.key);

    expect(new Set(keys).size).toBe(keys.length);
    // 6 themes x 8 tones, 30 fixed looks, 11 capsules, 8 effect icons.
    expect(keys.length).toBe(48 + 30 + 11 + 8);
  });

  it('creates every texture at its world size times its scale', () => {
    for (const spec of breakerTextureSpecs()) {
      expect(textures.exists(spec.key)).withContext(spec.key).toBeTrue();
      const frame = textures.getFrame(spec.key);
      expect(frame.width).withContext(`${spec.key} width`).toBe(Math.round(spec.width * spec.scale));
      expect(frame.height).withContext(`${spec.key} height`).toBe(Math.round(spec.height * spec.scale));
    }
  });

  it('paints the sizes the engine draws with, at 2x', () => {
    expect(TEXTURE_SCALE).toBe(2);
    const size = (key: string) => {
      const frame = textures.getFrame(key);
      return [frame.width, frame.height];
    };

    expect(size(brickTextureKey(0, 0))).toEqual([132, 52]);
    expect(size(BreakerTexture.STEEL)).toEqual([132, 52]);
    expect(size(BreakerTexture.PADDLE)).toEqual([264, 60]);
    expect(size(BreakerTexture.BALL)).toEqual([64, 64]);
    expect(size(capsuleTextureKey('multi'))).toEqual([128, 64]);
    expect(size(effectIconKey('fire'))).toEqual([48, 48]);
    expect(size(BreakerTexture.LASER_BOLT)).toEqual([24, 52]);
    expect(size(BreakerTexture.BARRIER)).toEqual([1920, 24]);
    expect(size(BreakerTexture.BG_SPACE)).toEqual([960, 720]);
    expect(size(BreakerTexture.VIGNETTE)).toEqual([480, 360]);
    expect(size(BreakerTexture.HUD_PANEL)).toEqual([1920, 128]);
  });

  it('paints bricks solid in the middle and fills them to the edges', () => {
    for (const key of [brickTextureKey(0, 0), brickTextureKey(5, 7), BreakerTexture.STEEL, BreakerTexture.PRISM]) {
      expect(alphaAt(key, 66, 26)).withContext(key).toBe(255);
      expect(alphaAt(key, 66, 1)).withContext(`${key} top edge`).toBeGreaterThan(200);
    }
  });

  it('paints the hit flash white and the crack overlays mostly see-through', () => {
    const flash = textures.getPixel(66, 26, BreakerTexture.BRICK_FLASH)!;

    expect([flash.red, flash.green, flash.blue, flash.alpha]).toEqual([255, 255, 255, 255]);
    expect(alphaAt(BreakerTexture.CRACK_1, 4, 4)).toBe(0);
  });

  it('gives each brick tone its own color', () => {
    const centre = (key: string) => {
      const c = textures.getPixel(66, 30, key)!;
      return `${c.red},${c.green},${c.blue}`;
    };
    const colors = [0, 1, 2, 3, 4, 5, 6, 7].map((tone) => centre(brickTextureKey(0, tone)));

    expect(new Set(colors).size).toBe(8);
  });

  it('bakes the ball glow inside its texture: solid core, faint halo, clear corners', () => {
    const c = (BallArt.SIZE * TEXTURE_SCALE) / 2;
    const core = BallArt.CORE_RADIUS * TEXTURE_SCALE;
    for (const key of [BreakerTexture.BALL, BreakerTexture.BALL_FIRE, BreakerTexture.BALL_NOVA]) {
      expect(alphaAt(key, c, c)).withContext(key).toBe(255);
      expect(alphaAt(key, c + core - 3, c)).withContext(`${key} core edge`).toBeGreaterThan(230);
      const halo = alphaAt(key, c + core + 4, c);
      expect(halo).withContext(`${key} halo`).toBeGreaterThan(10);
      expect(halo).withContext(`${key} halo`).toBeLessThan(230);
      expect(alphaAt(key, 1, 1)).withContext(`${key} corner`).toBe(0);
    }
  });

  it('makes each paddle 3-slice ready: cap frames, a uniform middle, and the whole texture by default', () => {
    const S = TEXTURE_SCALE;
    for (const key of [BreakerTexture.PADDLE, BreakerTexture.PADDLE_LASER, BreakerTexture.PADDLE_MAGNET]) {
      const texture = textures.get(key);
      const left = texture.get(PaddleArt.FRAMES.LEFT);
      const middle = texture.get(PaddleArt.FRAMES.MIDDLE);
      const right = texture.get(PaddleArt.FRAMES.RIGHT);

      expect(left.width).withContext(key).toBe(PaddleArt.CAP_WIDTH * S);
      expect(right.width).withContext(key).toBe(PaddleArt.CAP_WIDTH * S);
      expect(right.cutX).withContext(key).toBe((PaddleArt.WIDTH - PaddleArt.CAP_WIDTH) * S);
      expect(middle.width).withContext(key).toBe((PaddleArt.WIDTH - 2 * PaddleArt.CAP_WIDTH) * S);
      // Adding frames must not change what an image of the plain key shows.
      expect(texture.get().width).withContext(key).toBe(PaddleArt.WIDTH * S);

      // Every column of the middle slice is the same, so stretching it never shows.
      const firstColumn: string[] = [];
      const lastColumn: string[] = [];
      const x0 = PaddleArt.CAP_WIDTH * S;
      const x1 = (PaddleArt.WIDTH - PaddleArt.CAP_WIDTH) * S - 1;
      for (let y = 0; y < PaddleArt.HEIGHT * S; y++) {
        const a = textures.getPixel(x0, y, key)!;
        const b = textures.getPixel(x1, y, key)!;
        firstColumn.push(`${a.red},${a.green},${a.blue},${a.alpha}`);
        lastColumn.push(`${b.red},${b.green},${b.blue},${b.alpha}`);
      }
      expect(lastColumn).withContext(key).toEqual(firstColumn);
      // The body is solid in the middle.
      expect(alphaAt(key, (PaddleArt.WIDTH * S) / 2, (PaddleArt.HEIGHT * S) / 2)).withContext(key).toBe(255);
    }
  });

  it('keeps the barrier seamless: its first and last columns match', () => {
    const w = 1920;
    for (let y = 0; y < 24; y += 3) {
      const a = textures.getPixel(0, y, BreakerTexture.BARRIER)!;
      const b = textures.getPixel(w - 64, y, BreakerTexture.BARRIER)!;
      expect(`${b.red},${b.green},${b.blue},${b.alpha}`).withContext(`row ${y}`).toBe(
        `${a.red},${a.green},${a.blue},${a.alpha}`,
      );
    }
  });

  it('paints the background opaque and the screen overlays see-through in the middle', () => {
    expect(alphaAt(BreakerTexture.BG_SPACE, 480, 360)).toBe(255);
    expect(alphaAt(BreakerTexture.VIGNETTE, 240, 180)).toBeLessThan(20);
    expect(alphaAt(BreakerTexture.CRT_OVERLAY, 480, 361)).toBeLessThan(60);
    expect(alphaAt(BreakerTexture.HUD_PANEL, 960, 40)).toBe(255);
  });

  it('paints particles white so the scene can tint them', () => {
    for (const key of [BreakerTexture.SPARK, BreakerTexture.FLARE, BreakerTexture.TRAIL]) {
      const frame = textures.getFrame(key);
      const c = textures.getPixel(frame.width / 2, frame.height / 2, key)!;
      expect([c.red, c.green, c.blue]).withContext(key).toEqual([255, 255, 255]);
    }
  });

  it('does nothing the second time: same textures, no error', () => {
    const before = textures.get(BreakerTexture.BALL);
    const count = textures.getTextureKeys().length;

    expect(() => generateBreakerTextures(booted.scene)).not.toThrow();
    expect(textures.get(BreakerTexture.BALL)).toBe(before);
    expect(textures.getTextureKeys().length).toBe(count);
  });

  it('lays every texture out on a labeled sheet', () => {
    const before = booted.scene.children.list.length;

    drawTextureSheet(booted.scene);

    const added = booted.scene.children.list.slice(before);
    const images = added.filter((child) => child instanceof Phaser.GameObjects.Image);
    const labels = added.filter((child) => child instanceof Phaser.GameObjects.Text);
    expect(images.length).toBe(breakerTextureSpecs().length);
    expect(labels.length).toBe(breakerTextureSpecs().length);
  });
});
