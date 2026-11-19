import * as Phaser from 'phaser';
import { BreakerTexture, TEXTURE_SCALE } from '@app/data/models/breaker/BreakerKeys';
import { Pool } from './pool';
import { addLabel } from './bitmap-fonts';
import { COLOR, DEPTH, FONT } from './scene-kit';
import { clamp01, easeOutBack, easeOutCubic, pulse } from './view-math';

/** White at the edges, clear in the middle: tinted red for a lost life, magenta for nova. */
export const EDGE_GLOW_KEY = 'breaker-edge-glow';
const EDGE_GLOW_W = 240;
const EDGE_GLOW_H = 180;

interface Sprite {
  image: Phaser.GameObjects.Image;
  age: number;
  life: number;
  from: number;
  to: number;
  peak: number;
}

interface Floater {
  text: Phaser.GameObjects.BitmapText;
  age: number;
  life: number;
  rise: number;
  scale: number;
  baseY: number;
}

const FLOAT_MS = 820;

/** Paints the edge glow once per texture manager (it survives scene restarts). */
function ensureEdgeGlow(scene: Phaser.Scene): void {
  if (scene.textures.exists(EDGE_GLOW_KEY)) return;
  const texture = scene.textures.createCanvas(EDGE_GLOW_KEY, EDGE_GLOW_W, EDGE_GLOW_H);
  if (!texture) return;
  const ctx = texture.getContext();
  const w = EDGE_GLOW_W;
  const h = EDGE_GLOW_H;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(1, h / w);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.72);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.55, 'rgba(255,255,255,0)');
  g.addColorStop(0.82, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0.9)');
  ctx.fillStyle = g;
  ctx.fillRect(-w, -w, w * 2, w * 2);
  ctx.restore();
  texture.refresh();
}

/**
 * Every short-lived effect: particle emitters (shards tinted with the brick
 * tone, sparks), expanding rings and flares, floating texts, the edge glow,
 * camera shake and the slow-motion focus. Rings, flares and texts are
 * pooled and animated by hand in update(), so they follow the engine's
 * time scale and nothing is allocated while playing.
 */
export class FxLayer {
  private readonly shards: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly rings: Pool<Sprite>;
  private readonly flares: Pool<Sprite>;
  private readonly floaters: Pool<Floater>;
  private readonly edge: Phaser.GameObjects.Image;
  private edgeAlpha = 0;
  private edgeColor: number = COLOR.RED;
  private nova = false;
  private clockMs = 0;
  private timeScale = 1;
  private focused = false;

  constructor(
    private readonly scene: Phaser.Scene,
    world: Phaser.GameObjects.Layer,
    ui: Phaser.GameObjects.Layer
  ) {
    const s = 1 / TEXTURE_SCALE;
    this.shards = scene.add.particles(0, 0, BreakerTexture.SHARD, {
      emitting: false,
      lifespan: { min: 420, max: 820 },
      speed: { min: 90, max: 340 },
      angle: { min: 0, max: 360 },
      gravityY: 760,
      rotate: { min: -180, max: 180 },
      scale: { start: 1.2 * s, end: 0.35 * s },
      alpha: { start: 1, end: 0 },
      tint: 0xffffff,
      maxAliveParticles: 320,
      reserve: 320,
    });
    this.sparks = scene.add.particles(0, 0, BreakerTexture.SPARK, {
      emitting: false,
      lifespan: { min: 180, max: 380 },
      speed: { min: 60, max: 260 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8 * s, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: 0xffffff,
      maxAliveParticles: 160,
      reserve: 160,
    });
    this.shards.setDepth(DEPTH.PARTICLES);
    this.sparks.setDepth(DEPTH.PARTICLES);
    world.add(this.shards);
    world.add(this.sparks);

    const sprite = (key: string) => (): Sprite => {
      const image = scene.add.image(0, 0, key).setDepth(DEPTH.RINGS).setVisible(false);
      world.add(image);
      return { image, age: 0, life: 1, from: 1, to: 1, peak: 1 };
    };
    const hide = (item: Sprite) => item.image.setVisible(false);
    this.rings = new Pool(12, sprite(BreakerTexture.RING), undefined, hide);
    this.flares = new Pool(8, sprite(BreakerTexture.FLARE), undefined, hide);

    this.floaters = new Pool(
      12,
      () => {
        // A BitmapText: a new label every few bricks uploads no texture.
        const text = addLabel(scene, 0, 0, '', FONT.PIXEL, 18, COLOR.WHITE, { originX: 0.5, originY: 0.5 })
          .setDropShadow(0, 2, COLOR.INK, 1)
          .setDepth(DEPTH.TEXTS)
          .setVisible(false);
        world.add(text);
        return { text, age: 0, life: FLOAT_MS, rise: 30, scale: 1, baseY: 0 };
      },
      undefined,
      (f) => f.text.setVisible(false)
    );

    ensureEdgeGlow(scene);
    this.edge = scene.add
      .image(0, 0, EDGE_GLOW_KEY)
      .setOrigin(0, 0)
      .setDisplaySize(scene.scale.width, scene.scale.height)
      .setDepth(DEPTH.EDGE_GLOW)
      .setVisible(false);
    ui.add(this.edge);
  }

  /** Slow motion: particles and hand-made animations follow the engine. */
  setTimeScale(timeScale: number): void {
    if (timeScale === this.timeScale) return;
    this.timeScale = timeScale;
    this.shards.timeScale = timeScale;
    this.sparks.timeScale = timeScale;
  }

  shatter(x: number, y: number, count: number, tint: number): void {
    this.shards.particleTint = tint;
    this.shards.explode(count, x, y);
  }

  spark(x: number, y: number, count: number, tint: number): void {
    this.sparks.particleTint = tint;
    this.sparks.explode(count, x, y);
  }

  /** An expanding ring from `from` to `to` px across. */
  ring(x: number, y: number, from: number, to: number, lifeMs: number, tint: number, peak = 0.9): void {
    this.spawnSprite(this.rings, x, y, from, to, lifeMs, tint, peak);
  }

  flare(x: number, y: number, size: number, lifeMs: number, tint: number): void {
    this.spawnSprite(this.flares, x, y, size * 0.6, size * 1.4, lifeMs, tint, 1);
  }

  /** A text that pops in and rises off. `scale` 1 is 18 px. */
  float(x: number, y: number, label: string, tint: number, scale = 1): void {
    const f = this.floaters.acquire() ?? this.oldestFloater();
    if (!f) return;
    f.age = 0;
    f.scale = scale;
    f.baseY = y;
    f.life = FLOAT_MS;
    f.text.setText(label).setTint(tint).setPosition(x, y).setVisible(true).setAlpha(1).setScale(0.4 * scale);
  }

  shake(durationMs: number, intensity: number): void {
    this.scene.cameras.main.shake(durationMs, intensity);
  }

  /** A flash of color on the screen edges (a lost life). */
  edgeFlash(color: number, alpha: number): void {
    this.edgeColor = color;
    this.edgeAlpha = alpha;
    this.edge.setTint(color);
  }

  /** Nova burns: the edges pulse magenta until it ends. */
  setNova(on: boolean): void {
    this.nova = on;
  }

  /** The last brick: lean in towards it while the outro runs in slow motion. */
  focus(x: number, y: number): void {
    const cam = this.scene.cameras.main;
    this.focused = true;
    cam.zoomTo(1.12, 520, 'Sine.easeOut', true);
    cam.pan(x, y, 520, 'Sine.easeOut', true);
  }

  release(): void {
    if (!this.focused) return;
    this.focused = false;
    const cam = this.scene.cameras.main;
    cam.zoomTo(1, 320, 'Sine.easeInOut', true);
    cam.pan(this.scene.scale.width / 2, this.scene.scale.height / 2, 320, 'Sine.easeInOut', true);
  }

  update(dtMs: number): void {
    const dt = dtMs * this.timeScale;
    this.clockMs += dtMs;
    this.animateSprites(this.rings, dt, easeOutCubic);
    this.animateSprites(this.flares, dt, easeOutCubic);
    this.animateFloaters(dt);
    this.animateEdge(dtMs);
  }

  private spawnSprite(pool: Pool<Sprite>, x: number, y: number, from: number, to: number, life: number, tint: number, peak: number): void {
    const item = pool.acquire();
    if (!item) return;
    item.age = 0;
    item.life = life;
    item.from = from;
    item.to = to;
    item.peak = peak;
    item.image.setPosition(x, y).setTint(tint).setDisplaySize(from, from).setAlpha(peak).setVisible(true);
  }

  private animateSprites(pool: Pool<Sprite>, dt: number, ease: (t: number) => number): void {
    const items = pool.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!pool.isActive(item)) continue;
      item.age += dt;
      const t = clamp01(item.age / item.life);
      const size = item.from + (item.to - item.from) * ease(t);
      item.image.setDisplaySize(size, size).setAlpha(item.peak * (1 - t));
      if (t >= 1) pool.release(item);
    }
  }

  private animateFloaters(dt: number): void {
    const items = this.floaters.items;
    for (let i = 0; i < items.length; i++) {
      const f = items[i];
      if (!this.floaters.isActive(f)) continue;
      f.age += dt;
      const t = clamp01(f.age / f.life);
      const pop = easeOutBack(clamp01(t / 0.25));
      f.text
        .setScale(f.scale * (0.4 + 0.6 * pop))
        .setY(f.baseY - f.rise * easeOutCubic(t))
        .setAlpha(t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4);
      if (t >= 1) this.floaters.release(f);
    }
  }

  private animateEdge(dtMs: number): void {
    // A one-shot flash fades out; under it, nova keeps a slow magenta pulse.
    if (this.edgeAlpha > 0) this.edgeAlpha = Math.max(0, this.edgeAlpha - dtMs / 520);
    const novaAlpha = this.nova ? 0.22 + 0.2 * pulse(this.clockMs, 900) : 0;
    let alpha: number;
    if (this.edgeAlpha >= novaAlpha) {
      alpha = this.edgeAlpha;
      if (this.edge.tintTopLeft !== this.edgeColor) this.edge.setTint(this.edgeColor);
    } else {
      alpha = novaAlpha;
      if (this.edge.tintTopLeft !== COLOR.MAGENTA) this.edge.setTint(COLOR.MAGENTA);
    }
    if (alpha <= 0.001) {
      if (this.edge.visible) this.edge.setVisible(false);
      return;
    }
    this.edge.setVisible(true).setAlpha(alpha);
  }

  /** All floaters busy: recycle the one closest to done. */
  private oldestFloater(): Floater | null {
    let best: Floater | null = null;
    for (const f of this.floaters.items) {
      if (!best || f.age > best.age) best = f;
    }
    return best;
  }
}
