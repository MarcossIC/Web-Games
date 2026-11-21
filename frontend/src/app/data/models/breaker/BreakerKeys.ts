import type { PowerUpKind, TimedEffectKind } from '@app/data/services/breaker/engine/types';

/**
 * Texture keys and art sizes of Nova Breaker.
 *
 * Every texture is drawn in code (`services/breaker/assets/texture-factory.ts`).
 * Sizes here are in WORLD pixels (the 960x720 canvas). Sprite textures are
 * painted at `TEXTURE_SCALE` texture pixels per world pixel, so they stay sharp
 * when Scale.FIT blows the canvas up 1.3-1.8x: the scene shows them at their
 * world size with `setDisplaySize(spec.width, spec.height)` (or `setScale(1 / spec.scale)`).
 */
export const TEXTURE_SCALE = 2;

/** Brick palettes (see `BREAKER_THEMES`); `BreakerState.theme` wraps around them. */
export const BREAKER_THEME_COUNT = 6;
/** Tones per palette; `Brick.tone` wraps around them. */
export const BREAKER_TONE_COUNT = 8;

/** Every power-up kind; the Record makes the compiler reject a missing one. */
const POWER_UP_SET: Record<PowerUpKind, true> = {
  multi: true,
  wide: true,
  laser: true,
  magnet: true,
  slow: true,
  fire: true,
  barrier: true,
  life: true,
  nova: true,
  shrink: true,
  fast: true,
};
export const BREAKER_POWER_UPS = Object.keys(POWER_UP_SET) as readonly PowerUpKind[];

const TIMED_EFFECT_SET: Record<TimedEffectKind, true> = {
  wide: true,
  laser: true,
  magnet: true,
  slow: true,
  fire: true,
  barrier: true,
  shrink: true,
  fast: true,
};
export const BREAKER_TIMED_EFFECTS = Object.keys(TIMED_EFFECT_SET) as readonly TimedEffectKind[];

/** Textures with one fixed look. Bricks, capsules and HUD effect icons use the key helpers below. */
export const BreakerTexture = {
  // Brick overlays, same size as a brick, drawn over the tone texture.
  CRACK_1: 'crack-1',
  CRACK_2: 'crack-2',
  ARMOR_PLATE: 'armor-plate',
  BRICK_FLASH: 'brick-flash',
  // Special bricks.
  STEEL: 'steel',
  EXPLOSIVE: 'explosive',
  CAPSULE_BRICK: 'capsule-brick',
  PRISM: 'prism',
  // Paddle (3-slice ready, see PaddleArt).
  PADDLE: 'paddle',
  PADDLE_LASER: 'paddle-laser',
  PADDLE_MAGNET: 'paddle-magnet',
  // Balls and trail.
  BALL: 'ball',
  BALL_FIRE: 'ball-fire',
  BALL_NOVA: 'ball-nova',
  TRAIL: 'trail',
  // Lasers and barrier.
  LASER_BOLT: 'laser-bolt',
  BARRIER: 'barrier',
  // Particles: white, tint them in the scene.
  SHARD: 'shard',
  SPARK: 'spark',
  RING: 'ring',
  FLARE: 'flare',
  // Background and screen overlays.
  BG_SPACE: 'bg-space',
  BG_STARS: 'bg-stars',
  SCANLINES: 'scanlines',
  VIGNETTE: 'vignette',
  /** Scanlines and vignette baked together: one full-screen pass instead of two. */
  CRT_OVERLAY: 'crt-overlay',
  // HUD.
  HUD_PANEL: 'hud-panel',
  HUD_LIFE: 'hud-life',
  METER_FRAME: 'meter-frame',
  METER_FILL: 'meter-fill',
} as const;
export type BreakerTextureKey = (typeof BreakerTexture)[keyof typeof BreakerTexture];

/** A brick is exactly one engine brick: show it at (brick.x, brick.y) with origin 0 and this size. */
export const BrickArt = { WIDTH: 66, HEIGHT: 26, RADIUS: 4 } as const;

/**
 * The paddle textures hold the 18 px body plus GLOW_PAD of baked glow on every side
 * (the laser cannons stick up into the top pad).
 *
 * 3-slice: the left and right CAP_WIDTH world px (pad included) are fixed, the middle
 * is horizontally uniform, so stretching it never shows. For a paddle of width w:
 *  - WebGL: `scene.add.nineslice(x, y, key, undefined, (w + 2 * GLOW_PAD) * TEXTURE_SCALE, 0,
 *            CAP_WIDTH * TEXTURE_SCALE, CAP_WIDTH * TEXTURE_SCALE).setScale(1 / TEXTURE_SCALE)`
 *    then set `.width = (w + 2 * GLOW_PAD) * TEXTURE_SCALE` when it changes.
 *  - Phaser 4 NineSlice draws NOTHING with the Canvas renderer. Canvas fallback: three images
 *    with the frames in FRAMES (left cap, middle stretched to w + 2 * GLOW_PAD - 2 * CAP_WIDTH, right cap).
 */
export const PaddleArt = {
  BODY_HEIGHT: 18,
  GLOW_PAD: 6,
  /** Body width the texture is painted at; any width from 70 to 280 comes from slicing. */
  BASE_BODY_WIDTH: 120,
  CAP_WIDTH: 24,
  WIDTH: 132,
  HEIGHT: 30,
  FRAMES: { LEFT: 'cap-l', MIDDLE: 'mid', RIGHT: 'cap-r' },
} as const;

/** The ball texture is SIZE x SIZE; the solid core is CORE_RADIUS (= engine ball r), the rest is halo. */
export const BallArt = { CORE_RADIUS: 8, SIZE: 32, TRAIL_SIZE: 16 } as const;

/** Capsule body 56x24 (the engine's capsule) plus GLOW_PAD of glow on every side. */
export const CapsuleArt = { BODY_WIDTH: 56, BODY_HEIGHT: 24, GLOW_PAD: 4, WIDTH: 64, HEIGHT: 32 } as const;

/** Laser bolt 4x18 plus GLOW_PAD of glow on every side. */
export const LaserArt = { BOLT_WIDTH: 4, BOLT_HEIGHT: 18, GLOW_PAD: 4, WIDTH: 12, HEIGHT: 26 } as const;

/** Full-width barrier strip; its pattern repeats every PERIOD px, so a TileSprite can scroll it. */
export const BarrierArt = { WIDTH: 960, HEIGHT: 12, PERIOD: 32 } as const;

/** HUD band 0..64; the Overdrive meter fill sits FILL_INSET px inside its frame. */
export const HudArt = {
  PANEL_WIDTH: 960,
  PANEL_HEIGHT: 64,
  LIFE_WIDTH: 28,
  LIFE_HEIGHT: 12,
  METER_WIDTH: 184,
  METER_HEIGHT: 16,
  FILL_INSET: 4,
  FILL_WIDTH: 176,
  FILL_HEIGHT: 8,
  EFFECT_ICON_SIZE: 24,
} as const;

export interface BreakerTextureSpec {
  readonly key: string;
  /** Size in world pixels. */
  readonly width: number;
  readonly height: number;
  /** Texture pixels per world pixel: the texture is (width * scale) x (height * scale). */
  readonly scale: number;
}

function wrapIndex(value: number, count: number): number {
  const index = Number.isFinite(value) ? Math.floor(value) : 0;
  return ((index % count) + count) % count;
}

/** `brick-<theme>-<tone>`; both indexes wrap, so any sector theme and level tone has a texture. */
export function brickTextureKey(theme: number, tone: number): string {
  return `brick-${wrapIndex(theme, BREAKER_THEME_COUNT)}-${wrapIndex(tone, BREAKER_TONE_COUNT)}`;
}

/** `capsule-<kind>` */
export function capsuleTextureKey(kind: PowerUpKind): string {
  return `capsule-${kind}`;
}

/** `effect-icon-<kind>`: the 24x24 HUD icon of a timed effect. */
export function effectIconKey(kind: TimedEffectKind): string {
  return `effect-icon-${kind}`;
}

const S = TEXTURE_SCALE;

const FIXED_SPECS: Record<BreakerTextureKey, Omit<BreakerTextureSpec, 'key'>> = {
  'crack-1': { width: BrickArt.WIDTH, height: BrickArt.HEIGHT, scale: S },
  'crack-2': { width: BrickArt.WIDTH, height: BrickArt.HEIGHT, scale: S },
  'armor-plate': { width: BrickArt.WIDTH, height: BrickArt.HEIGHT, scale: S },
  'brick-flash': { width: BrickArt.WIDTH, height: BrickArt.HEIGHT, scale: S },
  steel: { width: BrickArt.WIDTH, height: BrickArt.HEIGHT, scale: S },
  explosive: { width: BrickArt.WIDTH, height: BrickArt.HEIGHT, scale: S },
  'capsule-brick': { width: BrickArt.WIDTH, height: BrickArt.HEIGHT, scale: S },
  prism: { width: BrickArt.WIDTH, height: BrickArt.HEIGHT, scale: S },
  paddle: { width: PaddleArt.WIDTH, height: PaddleArt.HEIGHT, scale: S },
  'paddle-laser': { width: PaddleArt.WIDTH, height: PaddleArt.HEIGHT, scale: S },
  'paddle-magnet': { width: PaddleArt.WIDTH, height: PaddleArt.HEIGHT, scale: S },
  ball: { width: BallArt.SIZE, height: BallArt.SIZE, scale: S },
  'ball-fire': { width: BallArt.SIZE, height: BallArt.SIZE, scale: S },
  'ball-nova': { width: BallArt.SIZE, height: BallArt.SIZE, scale: S },
  trail: { width: BallArt.TRAIL_SIZE, height: BallArt.TRAIL_SIZE, scale: S },
  'laser-bolt': { width: LaserArt.WIDTH, height: LaserArt.HEIGHT, scale: S },
  barrier: { width: BarrierArt.WIDTH, height: BarrierArt.HEIGHT, scale: S },
  shard: { width: 8, height: 8, scale: S },
  spark: { width: 16, height: 16, scale: S },
  ring: { width: 64, height: 64, scale: S },
  flare: { width: 32, height: 32, scale: S },
  // Full-screen layers stay at 1x: they are smooth, and 2x would quadruple their memory.
  'bg-space': { width: 960, height: 720, scale: 1 },
  'bg-stars': { width: 512, height: 512, scale: 1 },
  scanlines: { width: 960, height: 720, scale: 1 },
  // A pure gradient: half resolution scaled up is indistinguishable and 4x smaller.
  vignette: { width: 960, height: 720, scale: 0.5 },
  'crt-overlay': { width: 960, height: 720, scale: 1 },
  'hud-panel': { width: HudArt.PANEL_WIDTH, height: HudArt.PANEL_HEIGHT, scale: S },
  'hud-life': { width: HudArt.LIFE_WIDTH, height: HudArt.LIFE_HEIGHT, scale: S },
  'meter-frame': { width: HudArt.METER_WIDTH, height: HudArt.METER_HEIGHT, scale: S },
  'meter-fill': { width: HudArt.FILL_WIDTH, height: HudArt.FILL_HEIGHT, scale: S },
};

/** Fixed textures painted at the brick's size: on a tall world they follow its brick height. */
const BRICK_SIZED: ReadonlySet<string> = new Set([
  'crack-1',
  'crack-2',
  'armor-plate',
  'brick-flash',
  'steel',
  'explosive',
  'capsule-brick',
  'prism',
]);

/**
 * Size and scale of every generated texture, by key. `brickHeight` is the
 * world's brick height (taller on a phone held upright): every brick texture
 * is painted at it, so a tall brick is not a stretched short one.
 */
export function breakerTextureSpecs(brickHeight: number = BrickArt.HEIGHT): BreakerTextureSpec[] {
  const specs: BreakerTextureSpec[] = [];
  for (let theme = 0; theme < BREAKER_THEME_COUNT; theme++) {
    for (let tone = 0; tone < BREAKER_TONE_COUNT; tone++) {
      specs.push({ key: brickTextureKey(theme, tone), width: BrickArt.WIDTH, height: brickHeight, scale: S });
    }
  }
  for (const [key, spec] of Object.entries(FIXED_SPECS)) {
    specs.push({ key, ...spec, ...(BRICK_SIZED.has(key) ? { height: brickHeight } : {}) });
  }
  for (const kind of BREAKER_POWER_UPS) {
    specs.push({ key: capsuleTextureKey(kind), width: CapsuleArt.WIDTH, height: CapsuleArt.HEIGHT, scale: S });
  }
  for (const kind of BREAKER_TIMED_EFFECTS) {
    specs.push({ key: effectIconKey(kind), width: HudArt.EFFECT_ICON_SIZE, height: HudArt.EFFECT_ICON_SIZE, scale: S });
  }
  return specs;
}

/** The spec of one fixed texture. */
export function breakerTextureSpec(key: BreakerTextureKey): BreakerTextureSpec {
  return { key, ...FIXED_SPECS[key] };
}

/**
 * THE CORE (boss sectors). Painted in `services/breaker/assets/paint-boss.ts`;
 * generateBreakerTextures adds them with the rest. Phase textures are baked
 * per phase (no tint: the Canvas renderer cannot tint images).
 */
export const BossTexture = {
  CORE_1: 'boss-core-1',
  CORE_2: 'boss-core-2',
  CORE_3: 'boss-core-3',
  CRACKS_1: 'boss-cracks-1',
  CRACKS_2: 'boss-cracks-2',
  FLASH: 'boss-flash',
  EYE_1: 'boss-eye-1',
  EYE_2: 'boss-eye-2',
  EYE_3: 'boss-eye-3',
  PELLET: 'boss-pellet',
  HP_FRAME: 'boss-hp-frame',
  HP_FILL: 'boss-hp-fill',
  WARNING: 'boss-warning',
  STUN: 'boss-stun',
  RAIL: 'boss-rail',
} as const;
export type BossTextureKey = (typeof BossTexture)[keyof typeof BossTexture];

/**
 * Sizes in world px. The core textures are the 280x60 hull plus GLOW_PAD of
 * baked glow on every side: draw them at (boss.x - GLOW_PAD, boss.y - GLOW_PAD)
 * with origin 0. The eye is centered at EYE_Y px under the core's top.
 */
export const BossArt = {
  CORE_W: 280,
  CORE_H: 60,
  GLOW_PAD: 10,
  WIDTH: 300,
  HEIGHT: 80,
  EYE_W: 76,
  EYE_H: 44,
  EYE_Y: 44,
  PELLET_SIZE: 28,
  /** HP bar: the fill sits FILL_X, FILL_Y inside the frame. */
  HP_W: 360,
  HP_H: 22,
  HP_FILL_X: 58,
  HP_FILL_Y: 7,
  HP_FILL_W: 294,
  HP_FILL_H: 8,
  WARNING_W: 560,
  WARNING_H: 72,
  STUN_W: 150,
  STUN_H: 40,
  RAIL_W: 960,
  RAIL_H: 10,
} as const;

function bossCoreSpec(): Omit<BreakerTextureSpec, 'key'> {
  return { width: BossArt.WIDTH, height: BossArt.HEIGHT, scale: S };
}

const BOSS_SPECS: Record<BossTextureKey, Omit<BreakerTextureSpec, 'key'>> = {
  'boss-core-1': bossCoreSpec(),
  'boss-core-2': bossCoreSpec(),
  'boss-core-3': bossCoreSpec(),
  'boss-cracks-1': bossCoreSpec(),
  'boss-cracks-2': bossCoreSpec(),
  'boss-flash': bossCoreSpec(),
  'boss-eye-1': { width: BossArt.EYE_W, height: BossArt.EYE_H, scale: S },
  'boss-eye-2': { width: BossArt.EYE_W, height: BossArt.EYE_H, scale: S },
  'boss-eye-3': { width: BossArt.EYE_W, height: BossArt.EYE_H, scale: S },
  'boss-pellet': { width: BossArt.PELLET_SIZE, height: BossArt.PELLET_SIZE, scale: S },
  'boss-hp-frame': { width: BossArt.HP_W, height: BossArt.HP_H, scale: S },
  'boss-hp-fill': { width: BossArt.HP_FILL_W, height: BossArt.HP_FILL_H, scale: S },
  'boss-warning': { width: BossArt.WARNING_W, height: BossArt.WARNING_H, scale: S },
  'boss-stun': { width: BossArt.STUN_W, height: BossArt.STUN_H, scale: S },
  // A thin line across the screen: 1x is plenty.
  'boss-rail': { width: BossArt.RAIL_W, height: BossArt.RAIL_H, scale: 1 },
};

/** Size and scale of every boss texture, by key. */
export function bossTextureSpecs(): BreakerTextureSpec[] {
  return Object.entries(BOSS_SPECS).map(([key, spec]) => ({ key, ...spec }));
}

/** The core, eye and cracks textures for a phase (1..3) and hp share (0..1). */
export function bossCoreKey(phase: number): BossTextureKey {
  return phase >= 3 ? BossTexture.CORE_3 : phase === 2 ? BossTexture.CORE_2 : BossTexture.CORE_1;
}

export function bossEyeKey(phase: number): BossTextureKey {
  return phase >= 3 ? BossTexture.EYE_3 : phase === 2 ? BossTexture.EYE_2 : BossTexture.EYE_1;
}
