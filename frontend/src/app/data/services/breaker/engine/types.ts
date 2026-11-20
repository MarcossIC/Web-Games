/**
 * The contract between the Nova Breaker simulation and whoever draws it.
 * The engine is pure TypeScript: no Phaser, no DOM, no clock of its own.
 * The scene feeds it frame times and input, reads `BreakerState` to draw,
 * and reacts to the `BreakerEvent`s of each update (sound, particles, shake).
 *
 * Units: pixels of the 960x720 world and milliseconds. y grows downwards.
 */

export type BrickKind =
  | 'normal'
  | 'tough'
  | 'armored'
  | 'steel'
  | 'explosive'
  | 'capsule'
  | 'prism';

export type PowerUpKind =
  | 'multi'
  | 'wide'
  | 'laser'
  | 'magnet'
  | 'slow'
  | 'fire'
  | 'barrier'
  | 'life'
  | 'nova'
  | 'shrink'
  | 'fast';

/** Power-ups that last a while and show a timer in the HUD. */
export type TimedEffectKind = 'wide' | 'laser' | 'magnet' | 'slow' | 'fire' | 'barrier' | 'shrink' | 'fast';

/**
 * serve: a ball waits on the paddle for a launch.
 * playing: the rally.
 * clearing: the last brick fell; the outro runs (slow motion), nothing scores.
 * cleared: the outro ended; the scene shows the sector card and calls nextSector().
 * over: no lives left.
 */
export type EnginePhase = 'serve' | 'playing' | 'clearing' | 'cleared' | 'over';

export interface Brick {
  readonly id: number;
  readonly col: number;
  readonly row: number;
  /** Top-left corner, already including any row motion. */
  x: number;
  y: number;
  readonly w: number;
  readonly h: number;
  readonly kind: BrickKind;
  hp: number;
  readonly maxHp: number;
  /** Index into the sector theme's palette, chosen by the level. */
  readonly tone: number;
  alive: boolean;
  /** ms left of the white flash after a hit; the view fades it. */
  flashMs: number;
}

export interface Ball {
  readonly id: number;
  x: number;
  y: number;
  /** Position at the previous fixed step, for interpolation. */
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  readonly r: number;
  /** Stuck to the paddle (serve or magnet): it moves with it. */
  stuck: boolean;
  /** Where on the paddle it sits, from the paddle's center. */
  stuckOffset: number;
  alive: boolean;
}

export interface Paddle {
  /** Center x. */
  x: number;
  prevX: number;
  /** Top edge. */
  readonly y: number;
  /** Current width (eased towards targetW). */
  w: number;
  targetW: number;
  readonly h: number;
  /** px/s, used for spin and for drawing a lean. */
  vx: number;
}

export interface Capsule {
  readonly id: number;
  readonly kind: PowerUpKind;
  x: number;
  y: number;
  prevY: number;
  readonly vy: number;
  alive: boolean;
}

export interface Laser {
  readonly id: number;
  x: number;
  y: number;
  prevY: number;
  alive: boolean;
}

/** 1 at full health, 2 under 60% hp, 3 under 30%: each one shoots faster and moves quicker. */
export type BossPhase = 1 | 2 | 3;

/** An energy pellet the core shoots down at the paddle. Lasers and balls pop it. */
export interface BossPellet {
  readonly id: number;
  x: number;
  y: number;
  /** Position at the previous fixed step, for interpolation. */
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  readonly r: number;
  alive: boolean;
}

/**
 * THE CORE: the boss of every 5th sector. An armored block near the top that
 * glides left and right, shielded by a ring of bricks that move with it, with
 * a weak point (the eye) in the middle of its bottom face.
 */
export interface Boss {
  /** 1 for the boss of sector 5, 2 for sector 10, ... */
  readonly number: number;
  /** Top-left corner of the core. Draw it at x (not interpolated), like the bricks that move with it. */
  x: number;
  y: number;
  prevX: number;
  readonly w: number;
  readonly h: number;
  hp: number;
  readonly maxHp: number;
  phase: BossPhase;
  /** ms left of the flash after damage; the core takes no damage meanwhile. */
  invulnMs: number;
  /** ms before the next volley, so the view can charge the eye before it fires. */
  shotMs: number;
  /** False once destroyed: the wreck stays in the state through the outro. */
  alive: boolean;
  readonly pellets: readonly Readonly<BossPellet>[];
}

export interface ActiveEffect {
  readonly kind: TimedEffectKind;
  remainingMs: number;
  readonly durationMs: number;
  /** Stacks of wide; 1 for everything else. */
  stacks: number;
}

/** What the player is doing, sampled once per rendered frame. */
export interface BreakerInput {
  /** Keyboard steering, -1 (left) .. 1 (right); 0 when no key is down. */
  moveAxis: number;
  /** Pointer target for the paddle center in world x, or null when the pointer is not steering. */
  pointerX: number | null;
  /** Launch / release a stuck ball. True only on the frame it was pressed. */
  launchPressed: boolean;
  /** Fire is held (lasers repeat while held). */
  fireHeld: boolean;
  /** Overdrive asked for. True only on the frame it was pressed. */
  overdrivePressed: boolean;
}

export interface RunSummary {
  score: number;
  /** Sector the run ended in (or is in). */
  sector: number;
  sectorsCleared: number;
  /** Time played, pauses excluded. */
  timeMs: number;
  bricksBroken: number;
  maxCombo: number;
  powerUpsCaught: number;
  perfectHits: number;
  /** Clear time of each sector cleared this run, by sector number. */
  sectorTimes: Record<number, number>;
  /** A run started past sector 1 (a dev `?sector=N` run): shown, never recorded. */
  practice?: boolean;
}

export interface BreakerState {
  readonly phase: EnginePhase;
  readonly sector: number;
  readonly score: number;
  readonly lives: number;
  /** Time played this run, pauses and the clearing outro excluded. */
  readonly runTimeMs: number;
  /** Time spent in the current sector. */
  readonly sectorTimeMs: number;
  /** Par time of the current sector: beating it pays a bonus. */
  readonly parTimeMs: number;
  readonly combo: number;
  /** Score multiplier now, combo and nova included. */
  readonly multiplier: number;
  /** ms left before the combo is lost. */
  readonly comboRemainingMs: number;
  /** 0..1 */
  readonly overdrive: number;
  /** ms left of an active nova; 0 when none. */
  readonly novaRemainingMs: number;
  readonly paddle: Readonly<Paddle>;
  readonly balls: readonly Readonly<Ball>[];
  readonly bricks: readonly Readonly<Brick>[];
  readonly capsules: readonly Readonly<Capsule>[];
  readonly lasers: readonly Readonly<Laser>[];
  readonly effects: readonly Readonly<ActiveEffect>[];
  /** Barrier up at the bottom. */
  readonly barrier: boolean;
  /**
   * Simulation speed the view should apply to its own animations
   * (1 normally, 0.25 during the clearing slow motion).
   */
  readonly timeScale: number;
  /** 0..1 between the last two fixed steps: draw at prev + (cur - prev) * alpha. */
  readonly alpha: number;
  /** Index of the sector theme (palette) to draw with. */
  readonly theme: number;
  /** The core of a boss sector (every 5th); null in the others. */
  readonly boss?: Readonly<Boss> | null;
  /** ms the paddle is still jammed by a boss pellet; 0 when it is free. */
  readonly paddleStunMs?: number;
}

export type BreakerEvent =
  | { type: 'sector-started'; sector: number }
  | { type: 'ball-launched'; x: number; y: number }
  | { type: 'paddle-hit'; x: number; y: number; offset: number; perfect: boolean }
  | { type: 'wall-hit'; x: number; y: number }
  | { type: 'brick-hit'; brickId: number; x: number; y: number; kind: BrickKind; hpLeft: number }
  | {
      type: 'brick-destroyed';
      brickId: number;
      x: number;
      y: number;
      kind: BrickKind;
      tone: number;
      points: number;
      combo: number;
    }
  | { type: 'steel-hit'; x: number; y: number }
  | { type: 'explosion'; x: number; y: number; radius: number }
  | { type: 'ball-split'; x: number; y: number; count: number }
  | { type: 'capsule-spawned'; capsuleId: number; kind: PowerUpKind; x: number; y: number }
  | { type: 'capsule-caught'; kind: PowerUpKind; x: number; y: number }
  | { type: 'effect-ended'; kind: TimedEffectKind }
  | { type: 'laser-fired'; x: number; y: number }
  | { type: 'ball-lost'; x: number }
  | { type: 'barrier-used'; x: number }
  | { type: 'life-lost'; livesLeft: number }
  | { type: 'life-gained'; lives: number }
  | { type: 'overdrive-ready' }
  | { type: 'nova-started' }
  | { type: 'nova-ended' }
  | { type: 'combo-lost'; combo: number }
  | { type: 'last-brick'; x: number; y: number }
  | {
      type: 'sector-cleared';
      sector: number;
      timeMs: number;
      parTimeMs: number;
      bonus: number;
      noMiss: boolean;
      /** The part of `bonus` paid for destroying the core, on boss sectors. */
      bossBonus?: number;
    }
  | { type: 'game-over'; summary: RunSummary }
  /** The core took a hit. `damage` is 0 when it was still flashing from the last one. */
  | { type: 'boss-hit'; x: number; y: number; damage: number; hpLeft: number; weak: boolean }
  | { type: 'boss-phase'; phase: BossPhase; x: number; y: number }
  | { type: 'boss-shot'; x: number; y: number; count: number }
  | { type: 'pellet-hit-paddle'; x: number; y: number; stunMs: number }
  /** A pellet popped by a laser or a ball. */
  | { type: 'pellet-destroyed'; x: number; y: number }
  /** A shield brick grew back (a new brick id the view must start drawing). */
  | { type: 'shield-restored'; brickId: number; x: number; y: number }
  | { type: 'boss-defeated'; x: number; y: number; number: number; bonus: number }
  /**
   * Anti-stall help: a capsule dropped after 12 s without a brick hit, or the
   * paddle starting to bend bounces towards the bricks after 8 dry hits.
   */
  | { type: 'rescue'; mode: 'capsule' | 'nudge'; kind: PowerUpKind | null; x: number; y: number };

export interface BreakerEngineOptions {
  /** Seeds the level generator and the drops: same seed, same run. */
  seed: number;
  /** Sector to start in (1 by default). */
  startSector?: number;
  /**
   * Height of the world in px (720 by default, the desktop one; the width
   * is always 960). Taller worlds are for phones held upright.
   */
  height?: number;
}
