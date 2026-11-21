import * as Phaser from 'phaser';
import {
  BarrierArt,
  BREAKER_POWER_UPS,
  BREAKER_THEME_COUNT,
  BREAKER_TIMED_EFFECTS,
  BREAKER_TONE_COUNT,
  BreakerTexture,
  BreakerTextureSpec,
  breakerTextureSpecs,
  brickTextureKey,
  capsuleTextureKey,
  effectIconKey,
  PaddleArt,
} from '@app/data/models/breaker/BreakerKeys';
import { toneHex } from './breaker-themes';
import { generateBossTextures } from './paint-boss';
import { createPaint, Paint } from './paint';
import {
  paintArmorPlate,
  paintCapsuleBrick,
  paintCracks,
  paintExplosive,
  paintFlash,
  paintPrism,
  paintSteel,
  paintToneBrick,
} from './paint-bricks';
import {
  paintCrtOverlay,
  paintHudLife,
  paintHudPanel,
  paintMeterFill,
  paintMeterFrame,
  paintScanlines,
  paintSpaceBackground,
  paintStarLayer,
  paintVignette,
} from './paint-screen';
import {
  paintBall,
  paintBarrierTile,
  paintCapsule,
  paintEffectIcon,
  paintFlare,
  paintLaserBolt,
  paintPaddle,
  paintRing,
  paintShard,
  paintSoftDot,
} from './paint-sprites';

type Painter = (p: Paint) => void;

function painters(): Map<string, Painter> {
  const list = new Map<string, Painter>();

  for (let theme = 0; theme < BREAKER_THEME_COUNT; theme++) {
    for (let tone = 0; tone < BREAKER_TONE_COUNT; tone++) {
      const color = toneHex(theme, tone);
      list.set(brickTextureKey(theme, tone), (p) => paintToneBrick(p, color));
    }
  }

  const T = BreakerTexture;
  const fixed: Record<(typeof T)[keyof typeof T], Painter> = {
    [T.CRACK_1]: (p) => paintCracks(p, 1),
    [T.CRACK_2]: (p) => paintCracks(p, 2),
    [T.ARMOR_PLATE]: paintArmorPlate,
    [T.BRICK_FLASH]: paintFlash,
    [T.STEEL]: paintSteel,
    [T.EXPLOSIVE]: paintExplosive,
    [T.CAPSULE_BRICK]: paintCapsuleBrick,
    [T.PRISM]: paintPrism,
    [T.PADDLE]: (p) => paintPaddle(p, 'normal'),
    [T.PADDLE_LASER]: (p) => paintPaddle(p, 'laser'),
    [T.PADDLE_MAGNET]: (p) => paintPaddle(p, 'magnet'),
    [T.BALL]: (p) => paintBall(p, 'normal'),
    [T.BALL_FIRE]: (p) => paintBall(p, 'fire'),
    [T.BALL_NOVA]: (p) => paintBall(p, 'nova'),
    [T.TRAIL]: (p) => paintSoftDot(p, 0.2),
    [T.LASER_BOLT]: paintLaserBolt,
    [T.BARRIER]: paintBarrier,
    [T.SHARD]: paintShard,
    [T.SPARK]: (p) => paintSoftDot(p, 0.12),
    [T.RING]: paintRing,
    [T.FLARE]: paintFlare,
    [T.BG_SPACE]: paintSpaceBackground,
    [T.BG_STARS]: paintStarLayer,
    [T.SCANLINES]: (p) => paintScanlines(p),
    [T.VIGNETTE]: paintVignette,
    [T.CRT_OVERLAY]: paintCrtOverlay,
    [T.HUD_PANEL]: paintHudPanel,
    [T.HUD_LIFE]: paintHudLife,
    [T.METER_FRAME]: paintMeterFrame,
    [T.METER_FILL]: paintMeterFill,
  };
  for (const [key, paint] of Object.entries(fixed)) {
    list.set(key, paint);
  }

  for (const kind of BREAKER_POWER_UPS) {
    list.set(capsuleTextureKey(kind), (p) => paintCapsule(p, kind));
  }
  for (const kind of BREAKER_TIMED_EFFECTS) {
    list.set(effectIconKey(kind), (p) => paintEffectIcon(p, kind));
  }
  return list;
}

/** The barrier: one PERIOD tile repeated at whole texture pixels, so it tiles exactly. */
function paintBarrier(p: Paint): void {
  const tile = paintBarrierTile(p.scale);
  const { ctx } = p;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let x = 0; x < p.canvas.width; x += tile.width) {
    ctx.drawImage(tile, x, 0);
  }
  ctx.restore();
  // Sanity: the period must divide the strip, or the TileSprite would show a seam.
  if ((BarrierArt.WIDTH * p.scale) % tile.width !== 0) {
    throw new Error('Barrier width is not a whole number of periods');
  }
}

const PADDLE_KEYS: ReadonlySet<string> = new Set([
  BreakerTexture.PADDLE,
  BreakerTexture.PADDLE_LASER,
  BreakerTexture.PADDLE_MAGNET,
]);

/** Left cap, middle and right cap frames, for a 3-image paddle on the Canvas renderer. */
function addPaddleFrames(texture: Phaser.Textures.Texture, spec: BreakerTextureSpec): void {
  const s = spec.scale;
  const cap = PaddleArt.CAP_WIDTH * s;
  const width = spec.width * s;
  const height = spec.height * s;
  texture.add(PaddleArt.FRAMES.LEFT, 0, 0, 0, cap, height);
  texture.add(PaddleArt.FRAMES.MIDDLE, 0, cap, 0, width - 2 * cap, height);
  texture.add(PaddleArt.FRAMES.RIGHT, 0, width - cap, 0, cap, height);
  // Texture.add makes the first added frame the default one; keep the whole
  // texture as the default, or `add.image(x, y, 'paddle')` would show only a cap.
  texture.firstFrame = '__BASE';
}

/**
 * Paints every Nova Breaker texture onto canvases and adds them to the scene's
 * texture manager. Idempotent: keys that already exist are skipped, so it can run
 * on every boot (and after a scene restart) for free.
 *
 * `brickHeight`: the world's brick height (see `worldLayout`), the desktop one by default.
 *
 * Call it once in the boot scene's `create()` (it needs no loader). It runs in
 * roughly 100-300 ms on a desktop; nothing here runs per frame.
 */
export function generateBreakerTextures(scene: Phaser.Scene, brickHeight?: number): void {
  const textures = scene.textures;
  const paint = painters();
  for (const spec of breakerTextureSpecs(brickHeight)) {
    if (textures.exists(spec.key)) {
      continue;
    }
    const painter = paint.get(spec.key);
    if (!painter) {
      throw new Error(`No painter for texture "${spec.key}"`);
    }
    const p = createPaint(spec.width, spec.height, spec.scale);
    painter(p);
    // Painted before it is added: the upload (and CanvasTexture's pixel snapshot) sees the art.
    const texture = textures.addCanvas(spec.key, p.canvas);
    if (texture && PADDLE_KEYS.has(spec.key)) {
      addPaddleFrames(texture, spec);
    }
  }
  generateBossTextures(scene);
}

/**
 * Dev helper: lays every generated texture out in a labeled grid, at most 1x,
 * so the art can be reviewed in a browser. The mouse wheel scrolls the sheet.
 */
export function drawTextureSheet(scene: Phaser.Scene): void {
  generateBreakerTextures(scene);
  const specs = breakerTextureSpecs();
  const cols = 8;
  const cellW = 120;
  const cellH = 80;
  specs.forEach((spec, i) => {
    const x = (i % cols) * cellW + cellW / 2;
    const y = Math.floor(i / cols) * cellH + 34;
    scene.add.rectangle(x, y, cellW - 6, 60, 0x100e1c).setStrokeStyle(1, 0x2a2540);
    const fit = Math.min(1, (cellW - 12) / spec.width, 52 / spec.height);
    scene.add.image(x, y, spec.key).setDisplaySize(spec.width * fit, spec.height * fit);
    scene.add
      .text(x, y + 32, spec.key, { fontFamily: 'Space Mono, monospace', fontSize: '9px', color: '#a7a1c6' })
      .setOrigin(0.5, 0);
  });
  const height = Math.ceil(specs.length / cols) * cellH + 8;
  const camera = scene.cameras.main;
  scene.input.on(
    Phaser.Input.Events.POINTER_WHEEL,
    (_pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      camera.scrollY = Phaser.Math.Clamp(camera.scrollY + dy, 0, Math.max(0, height - camera.height));
    },
  );
}
