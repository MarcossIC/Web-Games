import {
  BALL,
  BOSS,
  BRICK,
  BRICK_HP,
  BRICK_POINTS,
  CAPSULE,
  CEILING,
  CLEARING,
  EFFECTS,
  GRID,
  LASER,
  LIVES,
  OVERDRIVE,
  PADDLE,
  RESCUE,
  ROW_MOTION_WALL_GAP,
  STEP,
  WORLD,
} from './config';
import {
  bossBonus,
  bossMaxHp,
  bossPhaseFor,
  glideEase,
  isBossSector,
  phaseCapsules,
  SHIELD_NEIGHBORS,
  SHIELD_REGEN_ORDER,
  SHIELD_SLOTS,
  shieldKinds,
  volleyAngle,
  volleyCount,
} from './boss';
import { sectorParams, type SectorParams } from './difficulty';
import { reflect, sweepCircleRect, type SweepHit } from './geometry';
import { buildLevel, isBreakable, parseLayout, themeForSector, type Level } from './levels';
import {
  ballSpeedFactor,
  EffectTimers,
  isTimedEffect,
  MercyTracker,
  paddleWidthFactor,
  pickPowerUp,
  rotateInto,
  shouldDrop,
  splitCount,
} from './powerups';
import { Rng } from './rng';
import { brickPoints, ComboMeter, comboMultiplier, extraLivesBetween, SCORE, sectorBonus } from './scoring';
import type {
  Ball,
  Boss,
  BossPellet,
  BreakerEngineOptions,
  BreakerEvent,
  BreakerInput,
  BreakerState,
  Brick,
  Capsule,
  EnginePhase,
  Laser,
  Paddle,
  PowerUpKind,
  RunSummary,
  TimedEffectKind,
} from './types';

/** No key down, no pointer, nothing pressed. Handy as a base for inputs. */
export const IDLE_INPUT: Readonly<BreakerInput> = Object.freeze({
  moveAxis: 0,
  pointerX: null,
  launchPressed: false,
  fireHeld: false,
  overdrivePressed: false,
});

/**
 * Test-only levers: a fixed layout for every sector, tuned sector params
 * and a starting score. Not part of the contract with the view; use
 * {@link BreakerEngine.forTest}.
 */
export interface BreakerTestOptions extends BreakerEngineOptions {
  layout?: readonly string[];
  params?: Partial<SectorParams>;
  score?: number;
  /** Force the core on (or off) whatever the sector; by default every 5th sector has it. */
  boss?: boolean;
  /** False: the core fights without its ring of shield bricks. */
  bossShields?: boolean;
  /** Start the core with this much hp (its max hp does not change). */
  bossHp?: number;
}

// The objects the engine owns. The contract exposes them read-only; inside
// they are mutable and carry a little extra bookkeeping.
interface SimBall extends Ball {
  id: number;
  /** ms before a magnet-held ball launches itself; 0 for a serve. */
  holdMs: number;
}
interface SimBrick extends Brick {
  /** A shield brick grows back with a new id. */
  id: number;
  baseX: number;
  baseY: number;
  /** Shield slot (0..7) of a brick that rings the core; -1 for a brick of the grid. */
  shield: number;
}
interface SimCapsule extends Capsule {
  id: number;
  kind: PowerUpKind;
}
interface SimLaser extends Laser {
  id: number;
}
interface SimPellet extends BossPellet {
  id: number;
}
interface SimBoss extends Boss {
  pellets: SimPellet[];
}

/** What the earliest contact of a sweep was. Plain numbers: no enum object on the hot path. */
const Contact = {
  None: 0,
  LeftWall: 1,
  RightWall: 2,
  Ceiling: 3,
  Paddle: 4,
  Brick: 5,
  Boss: 6,
} as const;

/** How far (px) a ball is moved off a surface it touched at t = 0, so the next pass starts clear of it. */
const CONTACT_NUDGE = 0.05;
const DEG = Math.PI / 180;
const MAX_BOUNCE_RAD = PADDLE.MAX_BOUNCE_DEG * DEG;

/**
 * The Nova Breaker simulation. Pure: no clock, no DOM, no Phaser. The scene
 * calls update() every frame with the frame time and the input; the engine
 * runs fixed steps of 1/120 s, so the game plays the same at any refresh
 * rate and the same seed with the same inputs replays the same run.
 *
 * Nothing is allocated per step on the hot path: balls, capsules and lasers
 * come from pools, dead objects are compacted out of their arrays in place,
 * and the arrays the state exposes are always the same instances. Bricks
 * are rebuilt once per sector. Events are the exception: they are small
 * objects made only when something happens.
 */
export class BreakerEngine {
  private readonly seed: number;
  private readonly rng: Rng;
  private layoutOverride: readonly string[] | null = null;
  private paramsOverride: Partial<SectorParams> | null = null;
  private params: SectorParams = sectorParams(1);

  private phase: EnginePhase = 'serve';
  private sector = 1;
  private score = 0;
  private lives: number = LIVES.START;
  private runTimeMs = 0;
  private sectorTimeMs = 0;
  private acc = 0;
  private alpha = 0;
  private timeScale = 1;

  private readonly paddle: Paddle = {
    x: WORLD.WIDTH / 2,
    prevX: WORLD.WIDTH / 2,
    y: PADDLE.Y,
    w: 0,
    targetW: 0,
    h: PADDLE.H,
    vx: 0,
  };
  private readonly balls: SimBall[] = [];
  private readonly ballPool: SimBall[] = [];
  private bricks: SimBrick[] = [];
  /** The bricks by grid cell (row * COLS + col), null once destroyed. */
  private grid: (SimBrick | null)[] = [];
  private readonly capsules: SimCapsule[] = [];
  private readonly capsulePool: SimCapsule[] = [];
  private readonly lasers: SimLaser[] = [];
  private readonly laserPool: SimLaser[] = [];

  // THE CORE (boss sectors). One object per boss sector; its pellets array is always this one.
  private boss: SimBoss | null = null;
  private readonly pellets: SimPellet[] = [];
  private readonly pelletPool: SimPellet[] = [];
  private shieldBricks: SimBrick[] = [];
  private bossOption: boolean | null = null;
  private bossShieldsOption = true;
  private bossHpOverride: number | null = null;
  /** The glide: from and to center x, time into it and its length; then a hold. */
  private bossFromX = 0;
  private bossToX = 0;
  private bossGlideMs = 0;
  private bossGlideTotalMs = 1;
  private bossHoldMs = 0;
  /** Time since the core last took damage, and towards the next shield regrowth. */
  private bossIdleMs = 0;
  private bossRegenMs = 0;
  private bossRegens = 0;
  /** Paid with the sector bonus once the outro ends. */
  private bossBonusDue = 0;
  /** ms the paddle stays jammed by a pellet. */
  private stunMs = 0;
  /** ms during which a pellet pops on the paddle instead of jamming it (the jam plus its guard). */
  private stunGuardMs = 0;

  // Anti-stall: time since a brick (or the core) was damaged, paddle hits since, rescues given.
  private idleMs = 0;
  private dryPaddleHits = 0;
  private rescues = 0;

  private readonly effects = new EffectTimers();
  private readonly combo = new ComboMeter();
  private readonly mercy = new MercyTracker();
  private overdrive = 0;
  private overdriveAnnounced = false;
  private novaMs = 0;

  private nextId = 1;
  private paddleHits = 0;
  private bricksBrokenInSector = 0;
  private breakableLeft = 0;
  private livesLostInSector = 0;
  private laserCooldownMs = 0;
  private clearingMs = 0;
  private bricksDied = false;

  /** How far the formation has come down (ceiling descent). */
  private formationY = 0;
  /** Time the rows have been swinging, s. */
  private motionTime = 0;
  /** Swing of each row, px; 0 for rows that stay put. */
  private rowAmplitude: number[] = [];

  // Edge inputs wait here for the first step that runs, so a press on a
  // frame too short for a step is not lost.
  private pendingLaunch = false;
  private pendingOverdrive = false;

  private readonly events: BreakerEvent[] = [];
  /** Events raised outside update() (a new sector, a debug power-up): sent with the next update. */
  private readonly queued: BreakerEvent[] = [];
  private emitting = false;
  private readonly ended: TimedEffectKind[] = [];
  private readonly explosionQueue: SimBrick[] = [];
  private exploding = false;

  // Scratch for the collision search.
  private readonly sweep: SweepHit = { t: 0, nx: 0, ny: 0, depth: 0 };
  private readonly velocity = { x: 0, y: 0 };

  // Totals of the run.
  private bricksBroken = 0;
  private powerUpsCaught = 0;
  private perfectHits = 0;
  private sectorsCleared = 0;
  private readonly sectorTimes: Record<number, number> = {};
  /** Started past sector 1 (a dev review): the run is shown, never recorded. */
  private practice = false;

  private readonly view: { -readonly [K in keyof BreakerState]: BreakerState[K] };

  constructor(options: BreakerEngineOptions) {
    this.seed = Math.floor(options.seed) >>> 0;
    this.rng = new Rng(options.seed);
    this.view = {
      phase: 'serve',
      sector: 1,
      score: 0,
      lives: LIVES.START,
      runTimeMs: 0,
      sectorTimeMs: 0,
      parTimeMs: 0,
      combo: 0,
      multiplier: 1,
      comboRemainingMs: 0,
      overdrive: 0,
      novaRemainingMs: 0,
      paddle: this.paddle,
      balls: this.balls,
      bricks: this.bricks,
      capsules: this.capsules,
      lasers: this.lasers,
      effects: this.effects.list,
      barrier: false,
      timeScale: 1,
      alpha: 0,
      theme: 0,
      boss: null,
      paddleStunMs: 0,
    };
    this.practice = Math.floor(options.startSector ?? 1) > 1;
    this.startSector(Math.max(1, Math.floor(options.startSector ?? 1)));
  }

  /**
   * An engine with a fixed layout (used for every sector), tuned params or
   * a starting score. For specs only: the game builds engines with `new`.
   */
  static forTest(options: BreakerTestOptions): BreakerEngine {
    const engine = new BreakerEngine(options);
    engine.layoutOverride = options.layout ?? null;
    engine.paramsOverride = options.params ?? null;
    engine.bossOption = options.boss ?? null;
    engine.bossShieldsOption = options.bossShields ?? true;
    engine.bossHpOverride = options.bossHp ?? null;
    engine.queued.length = 0;
    engine.startSector(Math.max(1, Math.floor(options.startSector ?? 1)));
    if (options.score) engine.score = options.score;
    return engine;
  }

  /**
   * What to draw. The same object every time, updated in place, and so are
   * the arrays in it: read it, do not keep copies of it between frames.
   */
  get state(): BreakerState {
    const v = this.view;
    v.phase = this.phase;
    v.sector = this.sector;
    v.score = this.score;
    v.lives = this.lives;
    v.runTimeMs = this.runTimeMs;
    v.sectorTimeMs = this.sectorTimeMs;
    v.parTimeMs = this.params.parTimeMs;
    v.combo = this.combo.combo;
    v.multiplier = comboMultiplier(this.combo.combo, this.novaMs > 0);
    v.comboRemainingMs = this.combo.remainingMs;
    v.overdrive = this.overdrive;
    v.novaRemainingMs = this.novaMs;
    v.bricks = this.bricks;
    v.barrier = this.effects.has('barrier');
    v.timeScale = this.timeScale;
    v.alpha = this.alpha;
    v.theme = themeForSector(this.sector);
    v.boss = this.boss;
    v.paddleStunMs = this.stunMs;
    return v;
  }

  /**
   * Advances the simulation by a frame. The frame is cut to 100 ms and run
   * as fixed steps of 1/120 s (8 at most per call); what is left over waits
   * for the next call and sets `alpha` for interpolation.
   *
   * Returns the events of this call. The array is reused: it is valid until
   * the next call to update(), so copy what must outlive it.
   */
  update(frameMs: number, input: BreakerInput): readonly BreakerEvent[] {
    const events = this.events;
    events.length = 0;
    for (const event of this.queued) events.push(event);
    this.queued.length = 0;
    this.emitting = true;

    if (input.launchPressed) this.pendingLaunch = true;
    if (input.overdrivePressed) this.pendingOverdrive = true;

    const frame = Number.isFinite(frameMs) ? Math.min(Math.max(frameMs, 0), STEP.MAX_FRAME_MS) : 0;
    this.acc += frame;
    let steps = 0;
    while (this.acc >= STEP.MS && steps < STEP.MAX_STEPS_PER_UPDATE) {
      this.step(input);
      this.acc -= STEP.MS;
      steps++;
    }
    // A backlog past the step budget is dropped: catching up would only
    // make the game stutter forward.
    if (this.acc >= STEP.MS) this.acc = 0;
    this.alpha = this.acc / STEP.MS;

    this.emitting = false;
    return events;
  }

  /** From `cleared`: builds the next sector and serves. Lives, score and overdrive carry over. */
  nextSector(): void {
    if (this.phase !== 'cleared') return;
    this.startSector(this.sector + 1);
  }

  summary(): RunSummary {
    return {
      score: this.score,
      sector: this.sector,
      sectorsCleared: this.sectorsCleared,
      timeMs: this.runTimeMs,
      bricksBroken: this.bricksBroken,
      maxCombo: this.combo.best,
      powerUpsCaught: this.powerUpsCaught,
      perfectHits: this.perfectHits,
      sectorTimes: { ...this.sectorTimes },
      ...(this.practice ? { practice: true } : {}),
    };
  }

  /**
   * Applies a power-up as if its capsule had been caught (without counting
   * it as caught). The engine calls it on a catch; specs and a debug
   * console can call it directly. Events raised here arrive with the next update().
   */
  applyPowerUp(kind: PowerUpKind): void {
    if (this.phase === 'over') return;
    switch (kind) {
      case 'multi':
        this.multiply();
        break;
      case 'life':
        if (this.lives < LIVES.MAX) {
          this.lives++;
          this.emit({ type: 'life-gained', lives: this.lives });
        } else {
          this.addScore(SCORE.LIFE_AT_MAX_POINTS);
        }
        break;
      case 'nova':
        this.overdrive = 1;
        this.announceOverdrive();
        break;
      default:
        if (isTimedEffect(kind)) {
          this.ended.length = 0;
          this.effects.activate(kind, this.params.durationScale, this.ended);
          this.emitEnded();
          this.paddle.targetW = this.params.paddleWidth * paddleWidthFactor(this.effects);
        }
    }
  }

  // ------------------------------------------------------------ the step

  private step(input: BreakerInput): void {
    const launch = this.pendingLaunch;
    const overdrive = this.pendingOverdrive;
    this.pendingLaunch = false;
    this.pendingOverdrive = false;

    const dt = STEP.MS;
    if (this.phase === 'over' || this.phase === 'cleared') return;

    if (this.phase === 'clearing') {
      this.stepClearing(input, dt);
      return;
    }

    this.movePaddle(input, dt);
    this.moveFormation(dt);
    // While serving the core still glides, but its shields do not grow back for free.
    this.moveBoss(dt, this.phase === 'playing');
    this.decayFlashes(dt);

    if (this.phase === 'serve') {
      this.carryStuckBalls();
      if (launch) {
        this.launchStuckBalls();
        this.phase = 'playing';
      }
      return;
    }

    // playing: only now do the run clock and the par clock tick.
    this.runTimeMs += dt;
    this.sectorTimeMs += dt;
    if (overdrive && this.overdrive >= 1 && this.novaMs <= 0) this.startNova();
    if (launch) this.launchStuckBalls();
    this.tickTimers(dt);
    if (this.phase !== 'playing') return; // the ceiling may have ended the run
    this.fireLasers(input, dt);
    this.moveLasers(dt);
    this.moveBalls(dt, true);
    if (this.phase === 'playing') this.moveCapsules(dt);
    if (this.phase === 'playing') this.bossAttack(dt);
    if (this.phase === 'playing') this.watchStall(dt);
    if (this.bricksDied) this.compactBricks();
  }

  private stepClearing(input: BreakerInput, dt: number): void {
    const slow = dt * this.timeScale;
    this.movePaddle(input, slow);
    this.moveFormation(slow);
    this.decayFlashes(dt);
    this.moveBalls(slow, false);
    if (this.bricksDied) this.compactBricks();
    this.clearingMs -= dt;
    if (this.clearingMs <= 0) this.finishSector();
  }

  private tickTimers(dt: number): void {
    if (this.novaMs > 0) {
      this.novaMs -= dt;
      if (this.novaMs <= 0) {
        this.novaMs = 0;
        this.emit({ type: 'nova-ended' });
      }
    }

    this.ended.length = 0;
    this.effects.tick(dt, this.ended);
    this.emitEnded();

    const lost = this.combo.tick(dt);
    if (lost > 0) this.emit({ type: 'combo-lost', combo: lost });

    for (const ball of this.balls) {
      if (!ball.stuck || ball.holdMs <= 0) continue;
      ball.holdMs -= dt;
      if (ball.holdMs <= 0) this.launchBall(ball);
    }

    this.descendCeiling(dt);
  }

  // ------------------------------------------------------------ sectors

  private startSector(sector: number): void {
    this.sector = sector;
    const hasBoss = this.bossOption ?? isBossSector(sector);
    // The core is the pressure of a boss sector: the ceiling holds still.
    this.params = { ...sectorParams(sector), ...(hasBoss ? { ceilingDescent: 0 } : {}), ...(this.paramsOverride ?? {}) };
    const level: Level = this.layoutOverride ? parseLayout(this.layoutOverride, sector) : buildLevel(sector, this.seed);

    this.buildBricks(level);
    this.releasePellets();
    this.setupBoss(hasBoss ? Math.max(1, Math.floor(sector / 5)) : 0);
    this.formationY = 0;
    this.motionTime = 0;

    this.ended.length = 0;
    this.effects.clear(this.ended);
    this.emitEnded();
    if (this.novaMs > 0) {
      this.novaMs = 0;
      this.emit({ type: 'nova-ended' });
    }
    this.combo.break();
    this.releaseCapsulesAndLasers();
    this.releaseBalls();

    this.sectorTimeMs = 0;
    this.paddleHits = 0;
    this.bricksBrokenInSector = 0;
    this.livesLostInSector = 0;
    this.clearingMs = 0;
    this.timeScale = 1;
    this.laserCooldownMs = 0;
    this.stunMs = 0;
    this.stunGuardMs = 0;
    this.idleMs = 0;
    this.dryPaddleHits = 0;
    this.rescues = 0;
    this.bossBonusDue = 0;

    const p = this.paddle;
    p.x = p.prevX = WORLD.WIDTH / 2;
    p.vx = 0;
    p.targetW = p.w = this.params.paddleWidth;
    this.serveBall();
    this.phase = 'serve';
    this.emit({ type: 'sector-started', sector });
  }

  private buildBricks(level: Level): void {
    const bricks: SimBrick[] = [];
    const grid: (SimBrick | null)[] = new Array(Math.max(1, level.rows) * GRID.COLS).fill(null);
    let breakable = 0;
    for (const cell of level.cells) {
      const x = GRID.LEFT + cell.col * GRID.STRIDE_X;
      const y = GRID.TOP + cell.row * GRID.STRIDE_Y;
      const hp = BRICK_HP[cell.kind];
      const brick: SimBrick = {
        id: this.nextId++,
        col: cell.col,
        row: cell.row,
        x,
        y,
        baseX: x,
        baseY: y,
        w: GRID.BRICK_W,
        h: GRID.BRICK_H,
        kind: cell.kind,
        hp,
        maxHp: hp,
        tone: cell.tone,
        alive: true,
        flashMs: 0,
        shield: -1,
      };
      bricks.push(brick);
      grid[cell.row * GRID.COLS + cell.col] = brick;
      if (isBreakable(cell.kind)) breakable++;
    }
    this.bricks = bricks;
    this.grid = grid;
    this.breakableLeft = breakable;
    this.bricksDied = false;

    // Each moving row swings as far as the sector asks, but never so far
    // that its end bricks would cross a wall.
    this.rowAmplitude = new Array(level.rows).fill(0);
    if (this.params.rowMotionAmplitude > 0) {
      for (const row of level.movingRows) {
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        for (const brick of bricks) {
          if (brick.row !== row) continue;
          minX = Math.min(minX, brick.baseX);
          maxX = Math.max(maxX, brick.baseX + brick.w);
        }
        if (minX > maxX) continue;
        const room = Math.min(
          minX - WORLD.LEFT_WALL_X - ROW_MOTION_WALL_GAP,
          WORLD.RIGHT_WALL_X - maxX - ROW_MOTION_WALL_GAP
        );
        this.rowAmplitude[row] = Math.max(0, Math.min(this.params.rowMotionAmplitude, room));
      }
    }
  }

  /** Last brick (or the core) down: the outro starts (slow motion, nothing scores, capsules vanish). */
  private startClearing(x: number, y: number, ms: number = CLEARING.MS): void {
    this.emit({ type: 'last-brick', x, y });
    this.phase = 'clearing';
    this.clearingMs = ms;
    this.timeScale = CLEARING.TIME_SCALE;
    this.releaseCapsulesAndLasers();
  }

  private finishSector(): void {
    const noMiss = this.livesLostInSector === 0;
    const bonus = sectorBonus(this.sector, this.sectorTimeMs, this.params.parTimeMs, noMiss);
    const bossPart = this.bossBonusDue;
    this.bossBonusDue = 0;
    this.sectorTimes[this.sector] = this.sectorTimeMs;
    this.sectorsCleared++;
    this.addScore(bonus.total + bossPart);
    this.emit({
      type: 'sector-cleared',
      sector: this.sector,
      timeMs: this.sectorTimeMs,
      parTimeMs: this.params.parTimeMs,
      bonus: bonus.total + bossPart,
      noMiss,
      ...(bossPart > 0 ? { bossBonus: bossPart } : {}),
    });
    this.phase = 'cleared';
    this.timeScale = 1;
  }

  // ------------------------------------------------------------ paddle

  private movePaddle(input: BreakerInput, dtMs: number): void {
    const p = this.paddle;
    const dt = dtMs / 1000;
    p.prevX = p.x;
    p.targetW = this.params.paddleWidth * paddleWidthFactor(this.effects);
    if (dt <= 0) return;

    if (this.stunGuardMs > 0) this.stunGuardMs = Math.max(0, this.stunGuardMs - dtMs);
    if (this.stunMs > 0) {
      // Jammed by a pellet: it holds still until the jam wears off.
      this.stunMs = Math.max(0, this.stunMs - dtMs);
      p.vx = 0;
    } else if (input.moveAxis !== 0 || input.pointerX === null) {
      // Keyboard: ease the speed towards the target, quick but not instant.
      const axis = Math.max(-1, Math.min(1, input.moveAxis));
      p.vx += (axis * PADDLE.KEY_SPEED - p.vx) * Math.min(1, dt * PADDLE.KEY_EASE);
      p.x += p.vx * dt;
    } else {
      // Pointer: close in on the target fast, but never teleport.
      const maxStep = PADDLE.POINTER_MAX_SPEED * dt;
      let step = (input.pointerX - p.x) * Math.min(1, dt * PADDLE.POINTER_EASE);
      if (step > maxStep) step = maxStep;
      else if (step < -maxStep) step = -maxStep;
      p.x += step;
      p.vx = step / dt;
    }

    p.w += (p.targetW - p.w) * Math.min(1, dt * PADDLE.WIDTH_EASE);
    const half = p.w / 2;
    if (p.x < WORLD.LEFT_WALL_X + half) {
      p.x = WORLD.LEFT_WALL_X + half;
      if (p.vx < 0) p.vx = 0;
    } else if (p.x > WORLD.RIGHT_WALL_X - half) {
      p.x = WORLD.RIGHT_WALL_X - half;
      if (p.vx > 0) p.vx = 0;
    }
  }

  // ------------------------------------------------------------ formation

  private moveFormation(dtMs: number): void {
    this.motionTime += dtMs / 1000;
    const speed = this.params.rowMotionSpeed;
    const amplitudes = this.rowAmplitude;
    for (const brick of this.bricks) {
      if (brick.shield >= 0) continue; // they ride with the core
      const amp = amplitudes[brick.row] ?? 0;
      // Neighbor rows swing in opposite directions.
      brick.x = amp > 0 ? brick.baseX + amp * Math.sin(speed * this.motionTime + (brick.row % 2) * Math.PI) : brick.baseX;
      brick.y = brick.baseY + this.formationY;
    }
  }

  /**
   * From sector 8 the formation creeps down. A breakable brick whose bottom
   * edge reaches y = 600 costs a life and pushes the whole formation back up
   * 90 px (never above where it started). The rally goes on: the ball is
   * not reset, so the penalty is the life, not the momentum.
   */
  private descendCeiling(dtMs: number): void {
    const rate = this.params.ceilingDescent;
    if (rate <= 0) return;
    this.formationY += (rate * dtMs) / 1000;

    // Unbreakable bricks (steel) never cost a life, but they must not sink
    // into the paddle lane either: the formation stops creeping at their limit.
    let lowest = Number.NEGATIVE_INFINITY;
    let lowestFixed = Number.NEGATIVE_INFINITY;
    for (const brick of this.bricks) {
      if (brick.shield >= 0 || !brick.alive) continue;
      const bottom = brick.baseY + this.formationY + brick.h;
      if (isBreakable(brick.kind)) lowest = Math.max(lowest, bottom);
      else lowestFixed = Math.max(lowestFixed, bottom);
    }
    if (lowestFixed > CEILING.DANGER_Y) this.formationY -= lowestFixed - CEILING.DANGER_Y;
    for (const brick of this.bricks) if (brick.shield < 0) brick.y = brick.baseY + this.formationY;
    if (lowest < CEILING.DANGER_Y) return;

    this.formationY = Math.max(0, this.formationY - CEILING.PUSH_BACK);
    for (const brick of this.bricks) if (brick.shield < 0) brick.y = brick.baseY + this.formationY;
    this.loseLife();
  }

  private decayFlashes(dtMs: number): void {
    for (const brick of this.bricks) if (brick.flashMs > 0) brick.flashMs = Math.max(0, brick.flashMs - dtMs);
  }

  // ------------------------------------------------------------ balls

  private ballSpeed(): number {
    const speedup = Math.min(BALL.MAX_SPEEDUP, BALL.SPEEDUP_PER_PADDLE_HIT * this.paddleHits);
    const nova = this.novaMs > 0 ? OVERDRIVE.NOVA_SPEED_FACTOR : 1;
    return this.params.ballSpeed * (1 + speedup) * ballSpeedFactor(this.effects) * nova;
  }

  private newBall(): SimBall {
    const ball =
      this.ballPool.pop() ??
      ({ id: 0, x: 0, y: 0, prevX: 0, prevY: 0, vx: 0, vy: 0, r: BALL.R, stuck: false, stuckOffset: 0, alive: true, holdMs: 0 } as SimBall);
    ball.id = this.nextId++;
    ball.alive = true;
    ball.stuck = false;
    ball.stuckOffset = 0;
    ball.holdMs = 0;
    ball.vx = 0;
    ball.vy = 0;
    this.balls.push(ball);
    return ball;
  }

  private serveBall(): void {
    const ball = this.newBall();
    ball.stuck = true;
    ball.x = ball.prevX = this.paddle.x;
    ball.y = ball.prevY = this.paddle.y - ball.r;
  }

  private releaseBalls(): void {
    for (const ball of this.balls) this.ballPool.push(ball);
    this.balls.length = 0;
  }

  private carryStuckBalls(): void {
    for (const ball of this.balls) {
      if (!ball.stuck) continue;
      ball.prevX = ball.x;
      ball.prevY = ball.y;
      ball.x = this.stuckX(ball);
      ball.y = this.paddle.y - ball.r;
    }
  }

  /** Where a held ball sits: on the paddle as it is now (it may have shrunk since the catch), inside the walls. */
  private stuckX(ball: SimBall): number {
    const half = Math.max(0, this.paddle.w / 2 - ball.r);
    ball.stuckOffset = Math.max(-half, Math.min(half, ball.stuckOffset));
    return Math.max(WORLD.LEFT_WALL_X + ball.r, Math.min(WORLD.RIGHT_WALL_X - ball.r, this.paddle.x + ball.stuckOffset));
  }

  private launchStuckBalls(): void {
    for (const ball of this.balls) if (ball.stuck) this.launchBall(ball);
  }

  /** Sends a stuck ball off the paddle at the angle its spot on the paddle gives. */
  private launchBall(ball: SimBall): void {
    const p = this.paddle;
    const offset = Math.max(-1, Math.min(1, ball.stuckOffset / (p.w / 2)));
    let angle = this.bounceAngle(offset);
    // Straight up is dull and can loop over the same bricks: tilt it a little.
    if (Math.abs(angle) < BALL.MIN_LAUNCH_RAD) angle = (angle < 0 || (angle === 0 && this.rng.chance(0.5)) ? -1 : 1) * BALL.MIN_LAUNCH_RAD;
    const speed = this.ballSpeed();
    ball.stuck = false;
    ball.holdMs = 0;
    ball.vx = speed * Math.sin(angle);
    ball.vy = -speed * Math.cos(angle);
    this.emit({ type: 'ball-launched', x: ball.x, y: ball.y });
  }

  /** Bounce angle from vertical for a hit at `offset` (-1..1), with a little english from the paddle's speed. */
  private bounceAngle(offset: number): number {
    const english = Math.max(-1, Math.min(1, this.paddle.vx / PADDLE.KEY_SPEED)) * PADDLE.ENGLISH_RAD;
    return Math.max(-MAX_BOUNCE_RAD, Math.min(MAX_BOUNCE_RAD, offset * MAX_BOUNCE_RAD + english));
  }

  /**
   * Moves every ball by one step and resolves its contacts. `live` is false
   * during the clearing outro: then nothing scores and a lost ball costs nothing.
   */
  private moveBalls(dtMs: number, live: boolean): void {
    const speed = this.ballSpeed();
    const barrierUp = this.effects.has('barrier');
    let barrierUsed = false;

    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i];
      if (!ball.alive) continue;
      ball.prevX = ball.x;
      ball.prevY = ball.y;
      if (ball.stuck) {
        ball.x = this.stuckX(ball);
        ball.y = this.paddle.y - ball.r;
        continue;
      }

      // The speed is set here every step, so slow, fast, nova and the
      // paddle-hit speedup apply at once, and bounces never drift it.
      const current = Math.hypot(ball.vx, ball.vy);
      if (current > 0) {
        ball.vx *= speed / current;
        ball.vy *= speed / current;
      } else {
        ball.vy = -speed;
      }

      this.collide(ball, dtMs / 1000, speed, live && this.phase === 'playing');

      if (!ball.stuck && ball.vy > 0 && barrierUp && !barrierUsed && ball.y + ball.r >= EFFECTS.BARRIER_Y) {
        ball.y = EFFECTS.BARRIER_Y - ball.r;
        ball.vy = -ball.vy;
        barrierUsed = true;
        this.effects.remove('barrier');
        this.emit({ type: 'barrier-used', x: ball.x });
      } else if (ball.y - ball.r > WORLD.LOST_Y) {
        ball.alive = false;
        this.emit({ type: 'ball-lost', x: ball.x });
      }
    }

    // Compact the dead balls out, keeping the order (and so the ids) of the rest.
    let kept = 0;
    for (let i = 0; i < this.balls.length; i++) {
      const ball = this.balls[i];
      if (ball.alive) this.balls[kept++] = ball;
      else this.ballPool.push(ball);
    }
    this.balls.length = kept;

    if (kept === 0 && live && this.phase === 'playing') this.loseLife();
  }

  /**
   * Continuous collision of one ball over `dt` seconds. Each pass sweeps the
   * rest of the displacement against the walls, the bricks and the paddle,
   * moves the ball to the earliest contact and resolves it; up to 4 bounces
   * per step (and a few pierced bricks on top), then the step is over.
   */
  private collide(ball: SimBall, dt: number, speed: number, live: boolean): void {
    this.sweepBall(ball, dt, speed, live);
    // Whatever pushed it (an overlap push-out next to a wall, a swinging row),
    // a ball never ends a step past a wall or the ceiling.
    const r = ball.r;
    if (ball.x < WORLD.LEFT_WALL_X + r) ball.x = WORLD.LEFT_WALL_X + r;
    else if (ball.x > WORLD.RIGHT_WALL_X - r) ball.x = WORLD.RIGHT_WALL_X - r;
    if (ball.y < WORLD.CEILING_Y + r) ball.y = WORLD.CEILING_Y + r;
  }

  private sweepBall(ball: SimBall, dt: number, speed: number, live: boolean): void {
    const r = ball.r;
    const pierce = live && (this.novaMs > 0 || this.effects.has('fire'));
    const hit = this.sweep;
    let time = dt;
    let bounces = 0;
    let contacts = 0;
    // Only the first brick of the step takes damage: a ball wedged between
    // two bricks bounces off both but breaks one.
    let damaged = false;

    while (time > 1e-9 && contacts < BALL.MAX_CONTACTS_PER_STEP) {
      const dx = ball.vx * time;
      const dy = ball.vy * time;

      let bestT = 2;
      let contact: number = Contact.None;
      let bestBrick: SimBrick | null = null;
      let bestDist = 0;
      let nx = 0;
      let ny = 0;
      let depth = 0;

      // Walls and ceiling: planes the center may not pass, r away from them.
      if (dx < 0 && ball.x + dx < WORLD.LEFT_WALL_X + r) {
        const t = Math.max(0, (WORLD.LEFT_WALL_X + r - ball.x) / dx);
        if (t < bestT) {
          bestT = t;
          contact = Contact.LeftWall;
          nx = 1;
          ny = 0;
        }
      } else if (dx > 0 && ball.x + dx > WORLD.RIGHT_WALL_X - r) {
        const t = Math.max(0, (WORLD.RIGHT_WALL_X - r - ball.x) / dx);
        if (t < bestT) {
          bestT = t;
          contact = Contact.RightWall;
          nx = -1;
          ny = 0;
        }
      }
      if (dy < 0 && ball.y + dy < WORLD.CEILING_Y + r) {
        const t = Math.max(0, (WORLD.CEILING_Y + r - ball.y) / dy);
        if (t < bestT) {
          bestT = t;
          contact = Contact.Ceiling;
          nx = 0;
          ny = 1;
        }
      }

      // Bricks: a cheap box test first, the sweep only for the ones in reach.
      const minX = Math.min(ball.x, ball.x + dx) - r;
      const maxX = Math.max(ball.x, ball.x + dx) + r;
      const minY = Math.min(ball.y, ball.y + dy) - r;
      const maxY = Math.max(ball.y, ball.y + dy) + r;
      for (const brick of this.bricks) {
        if (!brick.alive) continue;
        if (brick.x > maxX || brick.x + brick.w < minX || brick.y > maxY || brick.y + brick.h < minY) continue;
        if (!sweepCircleRect(ball.x, ball.y, dx, dy, r, brick.x, brick.y, brick.w, brick.h, hit)) continue;
        // On a tie (a seam between two bricks) the one nearer the ball wins.
        const dist = Math.abs(brick.x + brick.w / 2 - ball.x) + Math.abs(brick.y + brick.h / 2 - ball.y);
        if (hit.t < bestT || (hit.t === bestT && contact === Contact.Brick && dist < bestDist)) {
          bestT = hit.t;
          contact = Contact.Brick;
          bestBrick = brick;
          bestDist = dist;
          nx = hit.nx;
          ny = hit.ny;
          depth = hit.depth;
        }
      }

      const core = this.boss;
      if (core && core.alive && sweepCircleRect(ball.x, ball.y, dx, dy, r, core.x, core.y, core.w, core.h, hit) && hit.t < bestT) {
        bestT = hit.t;
        contact = Contact.Boss;
        bestBrick = null;
        nx = hit.nx;
        ny = hit.ny;
        depth = hit.depth;
      }

      const p = this.paddle;
      // The paddle is one-way: a rising ball, or one touching it from below
      // (a barrier save with the paddle moved over the ball), goes through.
      if (
        ball.vy >= 0 &&
        sweepCircleRect(ball.x, ball.y, dx, dy, r, p.x - p.w / 2, p.y, p.w, p.h, hit) &&
        hit.ny <= 0 &&
        hit.t < bestT
      ) {
        bestT = hit.t;
        contact = Contact.Paddle;
        bestBrick = null;
        nx = hit.nx;
        ny = hit.ny;
        depth = hit.depth;
        // A paddle hugging a wall leaves no room beside it: a ball pushed out
        // sideways would land in the wall, get pushed back, and never move.
        // It leaves through the top or the bottom instead.
        const outX = ball.x + nx * (depth + 0.01);
        if (depth > 0 && nx !== 0 && (outX < WORLD.LEFT_WALL_X + r || outX > WORLD.RIGHT_WALL_X - r)) {
          nx = 0;
          if (ball.y <= p.y + p.h / 2) {
            ny = -1;
            depth = ball.y - (p.y - r);
          } else {
            ny = 1;
            depth = p.y + p.h + r - ball.y;
          }
        }
      }

      if (contact === Contact.None) {
        ball.x += dx;
        ball.y += dy;
        return;
      }

      ball.x += dx * bestT;
      ball.y += dy * bestT;
      if (depth > 0) {
        ball.x += nx * (depth + 0.01);
        ball.y += ny * (depth + 0.01);
      }
      // A contact right where the ball stands consumes no time: nudge it off
      // the surface so the next pass starts clear of it, not touching again.
      if (bestT === 0 && !(contact === Contact.Brick && pierce && bestBrick!.kind !== 'steel')) {
        ball.x += nx * CONTACT_NUDGE;
        ball.y += ny * CONTACT_NUDGE;
      }
      time *= 1 - bestT;
      contacts++;

      switch (contact) {
        case Contact.LeftWall:
        case Contact.RightWall:
        case Contact.Ceiling: {
          this.bounce(ball, nx, ny, speed);
          if (contact === Contact.LeftWall) ball.x = Math.max(ball.x, WORLD.LEFT_WALL_X + r);
          else if (contact === Contact.RightWall) ball.x = Math.min(ball.x, WORLD.RIGHT_WALL_X - r);
          else ball.y = Math.max(ball.y, WORLD.CEILING_Y + r);
          const wx = contact === Contact.LeftWall ? WORLD.LEFT_WALL_X : contact === Contact.RightWall ? WORLD.RIGHT_WALL_X : ball.x;
          this.emit({ type: 'wall-hit', x: wx, y: contact === Contact.Ceiling ? WORLD.CEILING_Y : ball.y });
          bounces++;
          break;
        }
        case Contact.Paddle:
          if (this.paddleBounce(ball, nx, ny, speed, live)) return;
          bounces++;
          break;
        case Contact.Brick: {
          const brick = bestBrick!;
          if (pierce && brick.kind !== 'steel') {
            // Fire and nova go through: the brick is gone, the ball keeps its line.
            this.destroyBrick(brick, ball);
          } else {
            this.bounce(ball, nx, ny, speed);
            bounces++;
            if (brick.kind === 'steel') {
              this.emit({ type: 'steel-hit', x: ball.x - nx * r, y: ball.y - ny * r });
            } else if (live && !damaged) {
              damaged = true;
              this.damageBrick(brick, ball);
            }
          }
          break;
        }
        case Contact.Boss: {
          // Even fire and nova bounce off the core: it is armor, not a brick.
          this.bounce(ball, nx, ny, speed);
          bounces++;
          const hitCore = this.boss;
          if (live && !damaged && hitCore) {
            damaged = true;
            const cx = ball.x - nx * r;
            const weak = ny > 0.7 && Math.abs(cx - (hitCore.x + hitCore.w / 2)) <= BOSS.WEAK_W / 2;
            this.hitBoss(cx, ball.y - ny * r, pierce ? BOSS.PIERCE_DAMAGE : BOSS.BALL_DAMAGE, weak, BOSS.INVULN_MS, false);
          }
          break;
        }
      }
      if (bounces >= BALL.MAX_BOUNCES_PER_STEP) return;
    }
  }

  /** Mirrors the ball on a surface and keeps it from running flat. */
  private bounce(ball: SimBall, nx: number, ny: number, speed: number): void {
    this.velocity.x = ball.vx;
    this.velocity.y = ball.vy;
    reflect(this.velocity, nx, ny);
    ball.vx = this.velocity.x;
    ball.vy = this.velocity.y;
    this.keepSteep(ball, speed, nx, ny);
  }

  /**
   * |vy| >= 0.34 of the speed, so a ball never crawls from wall to wall.
   * With the normal (nx, ny) of the surface it just bounced off, the clamped
   * velocity always leaves that surface: grazing a corner, a plain "keep the
   * sign of vy" could point it back into the corner, a contact at t = 0 that
   * consumes no time, every step, forever (steel never breaks to free it).
   */
  private keepSteep(ball: SimBall, speed: number, nx = 0, ny = 0): void {
    const s = Math.hypot(ball.vx, ball.vy) || speed;
    const min = BALL.MIN_VY_SHARE * s;
    if (Math.abs(ball.vy) >= min) return;
    // On a surface that faces up or down, vy follows it; otherwise a ball
    // that went flat is sent down, towards the player, not up.
    const sy = ny !== 0 ? (ny < 0 ? -1 : 1) : ball.vy < 0 ? -1 : 1;
    let sx = ball.vx < 0 ? -1 : 1;
    const vx = Math.sqrt(s * s - min * min);
    if (sx * vx * nx + sy * min * ny < 0) sx = -sx;
    ball.vy = sy * min;
    ball.vx = sx * vx;
  }

  /**
   * The paddle hit. On its top (or a corner while the ball is still above
   * its middle) the angle comes from where it hit: -62..62 degrees from
   * vertical, plus some english. A hit on its side is a plain bounce.
   * Returns true when the magnet caught the ball.
   */
  private paddleBounce(ball: SimBall, nx: number, ny: number, speed: number, live: boolean): boolean {
    const p = this.paddle;
    const onTop = ny < 0 && ball.y <= p.y + p.h / 2;
    if (!onTop) {
      this.bounce(ball, nx, ny, speed);
      return false;
    }

    const half = p.w / 2;
    const offset = Math.max(-1, Math.min(1, (ball.x - p.x) / half));
    const perfect = Math.abs(offset) < PADDLE.PERFECT_SHARE;
    ball.y = Math.min(ball.y, p.y - ball.r);

    if (live && this.effects.has('magnet')) {
      ball.stuck = true;
      ball.holdMs = EFFECTS.MAGNET_HOLD_MS;
      ball.stuckOffset = Math.max(-(half - ball.r), Math.min(half - ball.r, ball.x - p.x));
      ball.vx = 0;
      ball.vy = 0;
      ball.y = p.y - ball.r;
      this.emit({ type: 'paddle-hit', x: ball.x, y: p.y, offset, perfect: false });
      return true;
    }

    let angle = this.bounceAngle(offset);
    if (live) {
      // A rally that touches nothing: from the 9th dry hit on, bend towards a brick.
      if (this.dryPaddleHits >= RESCUE.DRY_PADDLE_HITS) angle = this.nudge(ball, angle, this.dryPaddleHits === RESCUE.DRY_PADDLE_HITS);
      this.dryPaddleHits++;
    }
    ball.vx = speed * Math.sin(angle);
    ball.vy = -speed * Math.cos(angle);
    this.keepSteep(ball, speed);
    // A perfect pays once per rally that touched something: a vertical ball in an
    // empty column would otherwise farm points (and extra lives) forever.
    const paid = live && perfect && this.dryPaddleHits <= 1;
    this.emit({ type: 'paddle-hit', x: ball.x, y: p.y, offset, perfect: paid });

    if (live) {
      this.paddleHits++;
      if (paid) {
        this.perfectHits++;
        this.addScore(Math.round(PADDLE.PERFECT_POINTS * comboMultiplier(this.combo.combo, this.novaMs > 0)));
        this.addOverdrive(OVERDRIVE.PER_PERFECT);
      }
    }
    return false;
  }

  /** Multi: every free ball becomes three (+-20 degrees), up to the cap of 12. */
  private multiply(): void {
    const count = this.balls.length;
    const spread = BALL.MULTI_SPREAD_DEG * DEG;
    const speed = this.ballSpeed();
    for (let i = 0; i < count; i++) {
      const source = this.balls[i];
      const adds = splitCount(this.balls.length, 2, BALL.CAP);
      if (adds === 0) break;
      // A ball held on the paddle splits as if it had just been launched up.
      const vx = source.stuck ? 0 : source.vx;
      const vy = source.stuck ? -speed : source.vy;
      for (let k = 0; k < adds; k++) {
        const ball = this.newBall();
        ball.x = ball.prevX = source.x;
        ball.y = ball.prevY = source.y;
        rotateInto(vx, vy, k === 0 ? spread : -spread, this.velocity);
        ball.vx = this.velocity.x;
        ball.vy = this.velocity.y;
      }
    }
  }

  /** A prism splits the ball that broke it along the mirror angle. */
  private splitOnPrism(ball: SimBall): void {
    if (splitCount(this.balls.length, 1, BALL.CAP) === 0) return;
    const twin = this.newBall();
    twin.x = twin.prevX = ball.x;
    twin.y = twin.prevY = ball.y;
    const speed = Math.hypot(ball.vx, ball.vy);
    if (Math.abs(ball.vx) < 0.1 * speed) {
      // Too vertical to mirror: tilt the two apart instead.
      const tilt = BALL.PRISM_TILT_DEG * DEG;
      rotateInto(ball.vx, ball.vy, -tilt, this.velocity);
      twin.vx = -this.velocity.x;
      twin.vy = this.velocity.y;
      ball.vx = this.velocity.x;
      ball.vy = this.velocity.y;
    } else {
      twin.vx = -ball.vx;
      twin.vy = ball.vy;
    }
    this.emit({ type: 'ball-split', x: ball.x, y: ball.y, count: 2 });
  }

  // ------------------------------------------------------------ bricks

  private damageBrick(brick: SimBrick, ball: SimBall | null): void {
    if (brick.kind === 'steel') {
      this.emit({ type: 'steel-hit', x: brick.x + brick.w / 2, y: brick.y + brick.h / 2 });
      return;
    }
    brick.hp -= 1;
    brick.flashMs = BRICK.FLASH_MS;
    this.idleMs = 0;
    this.dryPaddleHits = 0;
    if (brick.hp > 0) {
      this.emit({
        type: 'brick-hit',
        brickId: brick.id,
        x: brick.x + brick.w / 2,
        y: brick.y + brick.h / 2,
        kind: brick.kind,
        hpLeft: brick.hp,
      });
      return;
    }
    this.destroyBrick(brick, ball);
  }

  /**
   * A brick is gone: score, combo, overdrive, maybe a capsule. An explosive
   * takes its 8 neighbors (steel aside); chains run through a queue, so a
   * long chain never recurses deep, and each explosive explodes once.
   */
  private destroyBrick(brick: SimBrick, ball: SimBall | null): void {
    if (!brick.alive || brick.kind === 'steel') return;
    brick.alive = false;
    brick.hp = 0;
    this.bricksDied = true;
    if (brick.shield < 0) this.grid[brick.row * GRID.COLS + brick.col] = null;
    this.breakableLeft--;
    this.idleMs = 0;
    this.dryPaddleHits = 0;

    const combo = this.combo.hit();
    const points = brickPoints(BRICK_POINTS[brick.kind], combo, this.novaMs > 0);
    this.addScore(points);
    const cx = brick.x + brick.w / 2;
    const cy = brick.y + brick.h / 2;
    this.emit({ type: 'brick-destroyed', brickId: brick.id, x: cx, y: cy, kind: brick.kind, tone: brick.tone, points, combo });
    this.addOverdrive(OVERDRIVE.PER_BRICK);

    // The last brick drops nothing: the outro removes capsules anyway. In a
    // boss sector the fight goes on, so every brick may drop.
    if (this.breakableLeft > 0 || this.boss?.alive) this.rollDrop(brick, cx, cy);
    this.bricksBroken++;
    this.bricksBrokenInSector++;

    if (brick.kind === 'prism' && ball) this.splitOnPrism(ball);
    if (brick.kind === 'explosive') {
      this.explosionQueue.push(brick);
      if (!this.exploding) this.runExplosions();
    }
    // A boss sector ends with the core, not with its bricks.
    if (this.breakableLeft === 0 && this.phase === 'playing' && !this.boss) this.startClearing(cx, cy);
  }

  private runExplosions(): void {
    this.exploding = true;
    const queue = this.explosionQueue;
    for (let i = 0; i < queue.length; i++) {
      const fuse = queue[i];
      this.emit({ type: 'explosion', x: fuse.x + fuse.w / 2, y: fuse.y + fuse.h / 2, radius: BRICK.EXPLOSION_RADIUS });
      if (fuse.shield >= 0) {
        // A shield fuse takes the shields next to it and burns the core.
        for (const j of SHIELD_NEIGHBORS[fuse.shield]) {
          const neighbor = this.shieldBricks[j];
          if (neighbor && neighbor.alive && neighbor.kind !== 'steel') this.destroyBrick(neighbor, null);
        }
        if (this.boss?.alive) this.hitBoss(fuse.x + fuse.w / 2, fuse.y + fuse.h / 2, BOSS.EXPLOSIVE_DAMAGE, false, BOSS.INVULN_MS, true);
        continue;
      }
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const row = fuse.row + dr;
          const col = fuse.col + dc;
          if ((dr === 0 && dc === 0) || col < 0 || col >= GRID.COLS || row < 0) continue;
          const neighbor = this.grid[row * GRID.COLS + col];
          if (neighbor && neighbor.alive && neighbor.kind !== 'steel') this.destroyBrick(neighbor, null);
        }
      }
    }
    queue.length = 0;
    this.exploding = false;
  }

  private compactBricks(): void {
    let kept = 0;
    for (let i = 0; i < this.bricks.length; i++) {
      const brick = this.bricks[i];
      if (brick.alive) this.bricks[kept++] = brick;
    }
    this.bricks.length = kept;
    this.bricksDied = false;
  }

  // ------------------------------------------------------------ capsules

  private rollDrop(brick: SimBrick, x: number, y: number): void {
    const dropped = shouldDrop(
      {
        sector: this.sector,
        brickKind: brick.kind,
        bricksBrokenInSector: this.bricksBrokenInSector,
        dropChance: this.params.dropChance,
        mercy: this.mercy.active(this.runTimeMs),
        capsulesFalling: this.capsules.length,
      },
      this.rng
    );
    if (!dropped) return;
    this.spawnCapsule(pickPowerUp(this.sector, this.params.negativeWeight, this.rng), x, y);
  }

  private spawnCapsule(kind: PowerUpKind, x: number, y: number): void {
    const capsule = this.capsulePool.pop() ?? ({ id: 0, kind, x: 0, y: 0, prevY: 0, vy: CAPSULE.FALL_SPEED, alive: true } as SimCapsule);
    capsule.id = this.nextId++;
    capsule.kind = kind;
    capsule.x = x;
    capsule.y = capsule.prevY = y;
    capsule.alive = true;
    this.capsules.push(capsule);
    this.emit({ type: 'capsule-spawned', capsuleId: capsule.id, kind, x, y });
  }

  private moveCapsules(dtMs: number): void {
    const p = this.paddle;
    const dt = dtMs / 1000;
    for (let i = 0; i < this.capsules.length; i++) {
      const c = this.capsules[i];
      if (!c.alive) continue;
      c.prevY = c.y;
      c.y += c.vy * dt;
      const caught =
        Math.abs(c.x - p.x) < (CAPSULE.W + p.w) / 2 && c.y + CAPSULE.H / 2 >= p.y && c.y - CAPSULE.H / 2 <= p.y + p.h;
      if (caught) {
        c.alive = false;
        this.powerUpsCaught++;
        this.emit({ type: 'capsule-caught', kind: c.kind, x: c.x, y: c.y });
        this.applyPowerUp(c.kind);
      } else if (c.y - CAPSULE.H / 2 > WORLD.LOST_Y) {
        c.alive = false;
      }
    }
    let kept = 0;
    for (let i = 0; i < this.capsules.length; i++) {
      const c = this.capsules[i];
      if (c.alive) this.capsules[kept++] = c;
      else this.capsulePool.push(c);
    }
    this.capsules.length = kept;
  }

  private releaseCapsulesAndLasers(): void {
    for (const c of this.capsules) this.capsulePool.push(c);
    this.capsules.length = 0;
    for (const l of this.lasers) this.laserPool.push(l);
    this.lasers.length = 0;
  }

  // ------------------------------------------------------------ lasers

  private fireLasers(input: BreakerInput, dtMs: number): void {
    if (this.laserCooldownMs > 0) this.laserCooldownMs -= dtMs;
    if (!input.fireHeld || !this.effects.has('laser') || this.laserCooldownMs > 0) return;
    // Keep the cadence exact while held, without banking shots while idle.
    this.laserCooldownMs = Math.max(0, this.laserCooldownMs) + LASER.FIRE_INTERVAL_MS;
    const p = this.paddle;
    const inset = p.w / 2 - LASER.EDGE_INSET;
    for (let side = -1; side <= 1; side += 2) {
      const laser = this.laserPool.pop() ?? ({ id: 0, x: 0, y: 0, prevY: 0, alive: true } as SimLaser);
      laser.id = this.nextId++;
      laser.x = p.x + side * inset;
      laser.y = laser.prevY = p.y - LASER.H / 2;
      laser.alive = true;
      this.lasers.push(laser);
      this.emit({ type: 'laser-fired', x: laser.x, y: laser.y });
    }
  }

  /** A bolt flies up and hurts the first brick it meets; steel just absorbs it. */
  private moveLasers(dtMs: number): void {
    const travel = (LASER.SPEED * dtMs) / 1000;
    const halfW = LASER.W / 2;
    const halfH = LASER.H / 2;
    for (let i = 0; i < this.lasers.length; i++) {
      const laser = this.lasers[i];
      if (!laser.alive) continue;
      laser.prevY = laser.y;
      laser.y -= travel;
      // The bolt sweeps from where it was to where it is: no brick is skipped.
      const top = laser.y - halfH;
      const bottom = laser.prevY + halfH;
      if (this.laserHitsPellet(laser.x, halfW, top, bottom)) {
        laser.alive = false;
        continue;
      }
      let target: SimBrick | null = null;
      for (const brick of this.bricks) {
        if (!brick.alive) continue;
        if (brick.x > laser.x + halfW || brick.x + brick.w < laser.x - halfW) continue;
        if (brick.y > bottom || brick.y + brick.h < top) continue;
        if (!target || brick.y + brick.h > target.y + target.h) target = brick;
      }
      const core = this.boss;
      if (
        core &&
        core.alive &&
        laser.x + halfW > core.x &&
        laser.x - halfW < core.x + core.w &&
        core.y <= bottom &&
        core.y + core.h >= top &&
        (!target || core.y + core.h > target.y + target.h)
      ) {
        laser.alive = false;
        this.hitBoss(laser.x, core.y + core.h, BOSS.LASER_DAMAGE, false, BOSS.LASER_INVULN_MS, false);
        continue;
      }
      if (target) {
        laser.alive = false;
        this.damageBrick(target, null);
      } else if (laser.y + halfH < WORLD.CEILING_Y) {
        laser.alive = false;
      }
    }
    let kept = 0;
    for (let i = 0; i < this.lasers.length; i++) {
      const laser = this.lasers[i];
      if (laser.alive) this.lasers[kept++] = laser;
      else this.laserPool.push(laser);
    }
    this.lasers.length = kept;
  }

  // ------------------------------------------------------------ score, overdrive, lives

  private addScore(points: number): void {
    if (points <= 0) return;
    const before = this.score;
    this.score += points;
    const gained = extraLivesBetween(before, this.score);
    for (let i = 0; i < gained && this.lives < LIVES.MAX; i++) {
      this.lives++;
      this.emit({ type: 'life-gained', lives: this.lives });
    }
  }

  /** Bricks and perfect hits fill the meter; it does not fill while nova burns. */
  private addOverdrive(amount: number): void {
    if (this.novaMs > 0) return;
    this.overdrive = Math.min(1, this.overdrive + amount);
    this.announceOverdrive();
  }

  private announceOverdrive(): void {
    if (this.overdrive >= 1 && !this.overdriveAnnounced) {
      this.overdriveAnnounced = true;
      this.emit({ type: 'overdrive-ready' });
    }
  }

  private startNova(): void {
    this.novaMs = OVERDRIVE.NOVA_MS;
    this.overdrive = 0;
    this.overdriveAnnounced = false;
    this.emit({ type: 'nova-started' });
  }

  /**
   * A life lost: by the last ball falling, or by the ceiling. The combo
   * breaks; a lost ball also clears the effects and serves a new ball.
   */
  private loseLife(): void {
    this.lives = Math.max(0, this.lives - 1);
    this.livesLostInSector++;
    this.mercy.lifeLost(this.runTimeMs);
    const lost = this.combo.break();
    if (lost > 0) this.emit({ type: 'combo-lost', combo: lost });
    this.emit({ type: 'life-lost', livesLeft: this.lives });

    const ballGone = this.balls.length === 0;
    if (ballGone || this.lives === 0) {
      this.ended.length = 0;
      this.effects.clear(this.ended);
      this.emitEnded();
      if (this.novaMs > 0) {
        this.novaMs = 0;
        this.emit({ type: 'nova-ended' });
      }
      this.releaseCapsulesAndLasers();
      this.releasePellets();
      this.stunMs = 0;
      this.stunGuardMs = 0;
      if (this.boss) this.boss.shotMs = BOSS.FIRST_SHOT_MS;
      this.paddleHits = 0;
    }
    this.idleMs = 0;
    this.dryPaddleHits = 0;

    if (this.lives === 0) {
      this.phase = 'over';
      this.timeScale = 1;
      this.emit({ type: 'game-over', summary: this.summary() });
      return;
    }
    if (ballGone) {
      this.serveBall();
      this.phase = 'serve';
    }
  }

  // ------------------------------------------------------------ THE CORE

  /** Builds the core of a boss sector (number > 0) with its shield ring, or clears it (0). */
  private setupBoss(number: number): void {
    this.shieldBricks = [];
    if (number <= 0) {
      this.boss = null;
      return;
    }
    const maxHp = bossMaxHp(number);
    const hp = this.bossHpOverride === null ? maxHp : Math.max(1, Math.min(maxHp, Math.floor(this.bossHpOverride)));
    const center = WORLD.WIDTH / 2;
    this.boss = {
      number,
      x: center - BOSS.W / 2,
      y: BOSS.Y,
      prevX: center - BOSS.W / 2,
      w: BOSS.W,
      h: BOSS.H,
      hp,
      maxHp,
      phase: bossPhaseFor(hp, maxHp),
      invulnMs: 0,
      shotMs: BOSS.FIRST_SHOT_MS,
      alive: true,
      pellets: this.pellets,
    };
    this.bossFromX = this.bossToX = center;
    this.bossGlideMs = 0;
    this.bossGlideTotalMs = 1;
    this.bossHoldMs = BOSS.HOLD_MS[0];
    this.bossIdleMs = 0;
    this.bossRegenMs = 0;
    this.bossRegens = 0;

    if (!this.bossShieldsOption) return;
    const kinds = shieldKinds(number);
    for (let slot = 0; slot < SHIELD_SLOTS.length; slot++) {
      const kind = kinds[slot];
      const brickHp = BRICK_HP[kind];
      const brick: SimBrick = {
        id: this.nextId++,
        col: slot,
        row: -1,
        x: 0,
        y: 0,
        baseX: 0,
        baseY: 0,
        w: GRID.BRICK_W,
        h: GRID.BRICK_H,
        kind,
        hp: brickHp,
        maxHp: brickHp,
        tone: SHIELD_SLOTS[slot].tone,
        alive: true,
        flashMs: 0,
        shield: slot,
      };
      this.shieldBricks.push(brick);
      this.bricks.push(brick);
      if (isBreakable(kind)) this.breakableLeft++;
    }
    this.placeShields();
  }

  /** The core glides between waypoints, its shields ride along, and they grow back while it rests. */
  private moveBoss(dt: number, regen: boolean): void {
    const core = this.boss;
    if (!core || !core.alive) return;
    core.prevX = core.x;
    if (core.invulnMs > 0) core.invulnMs = Math.max(0, core.invulnMs - dt);

    const i = core.phase - 1;
    if (this.bossHoldMs > 0) {
      this.bossHoldMs -= dt;
      if (this.bossHoldMs <= 0) this.pickWaypoint(core);
    } else {
      this.bossGlideMs += dt;
      const t = Math.min(1, this.bossGlideMs / this.bossGlideTotalMs);
      core.x = this.bossFromX + (this.bossToX - this.bossFromX) * glideEase(t) - core.w / 2;
      if (t >= 1) this.bossHoldMs = BOSS.HOLD_MS[i];
    }
    this.placeShields();
    if (!regen) return;

    this.bossIdleMs += dt;
    if (this.bossIdleMs < BOSS.SHIELD_REGEN_IDLE_MS || this.bossRegens >= BOSS.SHIELD_REGEN_CAP) return;
    this.bossRegenMs = Math.min(BOSS.SHIELD_REGEN_EVERY_MS, this.bossRegenMs + dt);
    if (this.bossRegenMs >= BOSS.SHIELD_REGEN_EVERY_MS && this.regrowShield()) this.bossRegenMs = 0;
  }

  /** The next stop: somewhere else on its rail, at least MIN_TRAVEL away. Seeded. */
  private pickWaypoint(core: SimBoss): void {
    const from = core.x + core.w / 2;
    let to = this.rng.range(BOSS.MIN_CENTER_X, BOSS.MAX_CENTER_X);
    if (Math.abs(to - from) < BOSS.MIN_TRAVEL) to = from + (to >= from ? 1 : -1) * BOSS.MIN_TRAVEL;
    if (to > BOSS.MAX_CENTER_X || to < BOSS.MIN_CENTER_X) to = from - (to - from);
    this.bossFromX = from;
    this.bossToX = to;
    this.bossGlideMs = 0;
    // Short hops take less time than a crossing, but never snap.
    const share = Math.abs(to - from) / (BOSS.MAX_CENTER_X - BOSS.MIN_CENTER_X);
    this.bossGlideTotalMs = BOSS.GLIDE_MS[core.phase - 1] * (0.45 + 0.55 * share);
  }

  private placeShields(): void {
    const core = this.boss;
    if (!core) return;
    for (const brick of this.shieldBricks) {
      const slot = SHIELD_SLOTS[brick.shield];
      brick.x = brick.baseX = core.x + slot.dx;
      brick.y = brick.baseY = core.y + slot.dy;
    }
  }

  /** Brings one missing shield back, the ones over the eye first; never on top of a ball. */
  private regrowShield(): boolean {
    // A shield that died this step is still in the array until it is compacted.
    if (this.bricksDied) return false;
    for (const slot of SHIELD_REGEN_ORDER) {
      const brick = this.shieldBricks[slot];
      if (!brick || brick.alive || this.ballNear(brick.x, brick.y, brick.w, brick.h)) continue;
      brick.id = this.nextId++;
      brick.alive = true;
      brick.hp = brick.maxHp;
      brick.flashMs = BRICK.FLASH_MS;
      this.bricks.push(brick);
      if (isBreakable(brick.kind)) this.breakableLeft++;
      this.bossRegens++;
      this.emit({ type: 'shield-restored', brickId: brick.id, x: brick.x + brick.w / 2, y: brick.y + brick.h / 2 });
      return true;
    }
    return false;
  }

  private ballNear(x: number, y: number, w: number, h: number): boolean {
    for (const ball of this.balls) {
      const margin = ball.r + 4;
      if (ball.x > x - margin && ball.x < x + w + margin && ball.y > y - margin && ball.y < y + h + margin) return true;
    }
    return false;
  }

  /**
   * Damage to the core from a ball, a laser or a shield fuse. A hit while it
   * still flashes only bounces (damage 0), unless `force` (an explosion).
   */
  private hitBoss(x: number, y: number, damage: number, weak: boolean, guardMs: number, force: boolean): void {
    const core = this.boss;
    if (!core || !core.alive) return;
    this.idleMs = 0;
    this.dryPaddleHits = 0;
    if (core.invulnMs > 0 && !force) {
      this.emit({ type: 'boss-hit', x, y, damage: 0, hpLeft: core.hp, weak: false });
      return;
    }
    const dealt = damage + (weak ? BOSS.WEAK_BONUS : 0);
    core.hp = Math.max(0, core.hp - dealt);
    core.invulnMs = Math.max(core.invulnMs, guardMs);
    this.bossIdleMs = 0;
    this.bossRegenMs = 0;
    this.addScore(Math.round(BOSS.POINTS_PER_DAMAGE * dealt * comboMultiplier(this.combo.combo, this.novaMs > 0)));
    this.addOverdrive(OVERDRIVE.PER_BRICK);
    this.emit({ type: 'boss-hit', x, y, damage: dealt, hpLeft: core.hp, weak });
    if (core.hp <= 0) {
      this.defeatBoss(core);
      return;
    }

    const phase = bossPhaseFor(core.hp, core.maxHp);
    if (phase <= core.phase) return;
    core.phase = phase;
    const cx = core.x + core.w / 2;
    const bottom = core.y + core.h;
    this.emit({ type: 'boss-phase', phase, x: cx, y: core.y + core.h / 2 });
    // Generous help to break through: these fall whatever the drop odds.
    const gifts = phaseCapsules(phase);
    for (let k = 0; k < gifts.length; k++) {
      if (this.capsules.length >= CAPSULE.MAX_FALLING + 2) break;
      const offset = (k - (gifts.length - 1) / 2) * (CAPSULE.W + 16);
      this.spawnCapsule(gifts[k], Math.max(CAPSULE.W, Math.min(WORLD.WIDTH - CAPSULE.W, cx + offset)), bottom + 14);
    }
  }

  /**
   * 0 hp: the core blows up, every brick left shatters (scoring nothing) and
   * the long outro starts. The bonus is paid with the sector bonus.
   */
  private defeatBoss(core: SimBoss): void {
    core.alive = false;
    core.hp = 0;
    core.invulnMs = 0;
    this.stunMs = 0;
    this.stunGuardMs = 0;
    const cx = core.x + core.w / 2;
    const cy = core.y + core.h / 2;
    const bonus = bossBonus(core.number);
    this.bossBonusDue = bonus;
    this.emit({ type: 'boss-defeated', x: cx, y: cy, number: core.number, bonus });
    this.releasePellets();
    for (const brick of this.bricks) {
      if (!brick.alive) continue;
      brick.alive = false;
      brick.hp = 0;
      if (brick.shield < 0) this.grid[brick.row * GRID.COLS + brick.col] = null;
      this.emit({
        type: 'brick-destroyed',
        brickId: brick.id,
        x: brick.x + brick.w / 2,
        y: brick.y + brick.h / 2,
        kind: brick.kind,
        tone: brick.tone,
        points: 0,
        combo: 0,
      });
    }
    this.bricksDied = true;
    this.breakableLeft = 0;
    this.explosionQueue.length = 0;
    this.startClearing(cx, cy, BOSS.CLEARING_MS);
  }

  /** While playing: the core shoots on its clock, and the pellets fall. */
  private bossAttack(dt: number): void {
    const core = this.boss;
    if (!core) return;
    if (core.alive) {
      core.shotMs -= dt;
      if (core.shotMs <= 0) {
        this.fireVolley(core);
        core.shotMs += BOSS.SHOT_EVERY_MS[core.phase - 1];
      }
    }
    this.movePellets(dt);
  }

  private fireVolley(core: SimBoss): void {
    const x = core.x + core.w / 2;
    const y = core.y + core.h;
    const p = this.paddle;
    const aim = Math.atan2(p.x - x, Math.max(1, p.y - y));
    const speed = BOSS.PELLET_SPEED[core.phase - 1];
    const count = volleyCount(core.phase);
    let fired = 0;
    for (let k = 0; k < count && this.pellets.length < BOSS.MAX_PELLETS; k++) {
      const angle = volleyAngle(core.phase, k, aim);
      const pellet =
        this.pelletPool.pop() ??
        ({ id: 0, x: 0, y: 0, prevX: 0, prevY: 0, vx: 0, vy: 0, r: BOSS.PELLET_R, alive: true } as SimPellet);
      pellet.id = this.nextId++;
      pellet.x = pellet.prevX = x;
      pellet.y = pellet.prevY = y;
      pellet.vx = speed * Math.sin(angle);
      pellet.vy = speed * Math.cos(angle);
      pellet.alive = true;
      this.pellets.push(pellet);
      fired++;
    }
    if (fired > 0) this.emit({ type: 'boss-shot', x, y, count: fired });
  }

  /** Pellets fall; one on the paddle jams it, a ball passing through pops it. */
  private movePellets(dtMs: number): void {
    if (this.pellets.length === 0) return;
    const dt = dtMs / 1000;
    const p = this.paddle;
    const left = p.x - p.w / 2;
    for (let i = 0; i < this.pellets.length; i++) {
      const pellet = this.pellets[i];
      if (!pellet.alive) continue;
      pellet.prevX = pellet.x;
      pellet.prevY = pellet.y;
      pellet.x += pellet.vx * dt;
      pellet.y += pellet.vy * dt;
      const r = pellet.r;

      const qx = pellet.x < left ? left : pellet.x > left + p.w ? left + p.w : pellet.x;
      const qy = pellet.y < p.y ? p.y : pellet.y > p.y + p.h ? p.y + p.h : pellet.y;
      if ((pellet.x - qx) * (pellet.x - qx) + (pellet.y - qy) * (pellet.y - qy) < r * r) {
        pellet.alive = false;
        if (this.stunGuardMs > 0) {
          // Jammed or just freed: the pellet pops, the jam is not renewed (no stun-lock).
          this.emit({ type: 'pellet-destroyed', x: pellet.x, y: pellet.y });
          continue;
        }
        this.stunMs = BOSS.STUN_MS;
        this.stunGuardMs = BOSS.STUN_MS + BOSS.STUN_GUARD_MS;
        this.emit({ type: 'pellet-hit-paddle', x: pellet.x, y: p.y, stunMs: BOSS.STUN_MS });
        continue;
      }
      if (pellet.y - r > WORLD.LOST_Y || pellet.x < -r || pellet.x > WORLD.WIDTH + r) {
        pellet.alive = false;
        continue;
      }
      for (const ball of this.balls) {
        if (ball.stuck) continue;
        const reach = ball.r + r;
        const bx = ball.x - pellet.x;
        const by = ball.y - pellet.y;
        if (bx * bx + by * by < reach * reach) {
          pellet.alive = false;
          this.emit({ type: 'pellet-destroyed', x: pellet.x, y: pellet.y });
          break;
        }
      }
    }
    let kept = 0;
    for (let i = 0; i < this.pellets.length; i++) {
      const pellet = this.pellets[i];
      if (pellet.alive) this.pellets[kept++] = pellet;
      else this.pelletPool.push(pellet);
    }
    this.pellets.length = kept;
  }

  /** A laser bolt sweeping (x +- halfW, top..bottom) pops the first pellet it meets. */
  private laserHitsPellet(x: number, halfW: number, top: number, bottom: number): boolean {
    for (const pellet of this.pellets) {
      if (!pellet.alive) continue;
      if (Math.abs(pellet.x - x) >= halfW + pellet.r) continue;
      if (pellet.y + pellet.r < top || pellet.y - pellet.r > bottom) continue;
      pellet.alive = false;
      this.emit({ type: 'pellet-destroyed', x: pellet.x, y: pellet.y });
      return true;
    }
    return false;
  }

  private releasePellets(): void {
    for (const pellet of this.pellets) this.pelletPool.push(pellet);
    this.pellets.length = 0;
  }

  // ------------------------------------------------------------ anti-stall rescue

  /**
   * 12 s of play without damaging a brick (or the core): a capsule falls
   * from the top over what is left. Multi and fire take turns; a laser when
   * steel is most of what remains. The clock restarts, so at most one every 12 s.
   */
  private watchStall(dt: number): void {
    const bossUp = this.boss !== null && this.boss.alive;
    if (this.breakableLeft <= 0 && !bossUp) {
      this.idleMs = 0;
      return;
    }
    this.idleMs += dt;
    if (this.idleMs < RESCUE.IDLE_MS || this.capsules.length >= CAPSULE.MAX_FALLING) return;
    this.idleMs = 0;

    let steel = 0;
    let breakable = 0;
    let sumX = 0;
    for (const brick of this.bricks) {
      if (!brick.alive) continue;
      if (brick.kind === 'steel') {
        steel++;
      } else {
        breakable++;
        sumX += brick.x + brick.w / 2;
      }
    }
    let kind: PowerUpKind;
    if (breakable > 0 && steel >= breakable) {
      kind = 'laser';
    } else {
      kind = this.rescues % 2 === 0 ? 'multi' : 'fire';
      this.rescues++;
    }
    const core = this.boss;
    const centerX = core && core.alive ? core.x + core.w / 2 : breakable > 0 ? sumX / breakable : WORLD.WIDTH / 2;
    const half = CAPSULE.W / 2 + 4;
    const x = Math.max(half, Math.min(WORLD.WIDTH - half, centerX));
    const y = WORLD.CEILING_Y + CAPSULE.H;
    this.spawnCapsule(kind, x, y);
    this.emit({ type: 'rescue', mode: 'capsule', kind, x, y });
  }

  /**
   * Turns a paddle bounce at most NUDGE_DEG towards the live brick (or the
   * core) whose center is nearest the ball in x. Subtle and seedless.
   */
  private nudge(ball: SimBall, angle: number, announce: boolean): number {
    let tx = 0;
    let ty = 0;
    let best = Number.POSITIVE_INFINITY;
    for (const brick of this.bricks) {
      if (!brick.alive || brick.kind === 'steel') continue;
      const cx = brick.x + brick.w / 2;
      const d = Math.abs(cx - ball.x);
      if (d < best) {
        best = d;
        tx = cx;
        ty = brick.y + brick.h / 2;
      }
    }
    const core = this.boss;
    if (core && core.alive) {
      const cx = core.x + core.w / 2;
      if (Math.abs(cx - ball.x) < best) {
        best = Math.abs(cx - ball.x);
        tx = cx;
        ty = core.y + core.h;
      }
    }
    if (best === Number.POSITIVE_INFINITY) return angle;
    const want = Math.atan2(tx - ball.x, Math.max(1, ball.y - ty));
    const max = RESCUE.NUDGE_DEG * DEG;
    const turn = Math.max(-max, Math.min(max, want - angle));
    if (announce) this.emit({ type: 'rescue', mode: 'nudge', kind: null, x: tx, y: ty });
    return Math.max(-MAX_BOUNCE_RAD, Math.min(MAX_BOUNCE_RAD, angle + turn));
  }

  // ------------------------------------------------------------ events

  private emit(event: BreakerEvent): void {
    (this.emitting ? this.events : this.queued).push(event);
  }

  private emitEnded(): void {
    for (const kind of this.ended) this.emit({ type: 'effect-ended', kind });
    this.ended.length = 0;
  }
}
