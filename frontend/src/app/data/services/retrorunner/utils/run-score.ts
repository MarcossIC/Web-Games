/**
 * How a run is scored. The distance is what counts most; coins are a small
 * extra; keeping the pace (the rhythm) makes the distance worth more.
 * Every number of the score lives here.
 */
export const SCORING = {
  /** Running this far forward adds a point of distance. */
  PX_PER_POINT: 10,
  /** What a coin is worth on its own, always, wherever it is. */
  COIN_POINTS: 4,
  /** What each further coin of a combo adds to its value. */
  COMBO_STEP_POINTS: 1,
  MAX_COMBO: 5,
  /** Coins picked up closer together than this make a combo. */
  COMBO_WINDOW_MS: 1500,
  /** Moving forward at this share of the top speed or more keeps the pace. */
  RHYTHM_SPEED_SHARE: 0.8,
  /** The pace has to hold this long before the rhythm starts. */
  RHYTHM_AFTER_MS: 1000,
  /** Slower than the pace for this long breaks the rhythm. */
  RHYTHM_GRACE_MS: 300,
  /** While in rhythm, each point of distance adds this much more. */
  RHYTHM_BONUS: 0.5,
} as const;

/** Where the best score is kept. Scores from before this scoring do not compare. */
export const BEST_SCORE_KEY = 'retroRunnerBestScore';

/** A finished run, for the game over screen. */
export interface RunSummary {
  /** How long the run was played: pauses do not count. */
  timeMs: number;
  /** Points for the ground covered. */
  distance: number;
  coins: number;
  /** The longest combo of the run: 1 to MAX_COMBO, 0 with no coins. */
  maxCombo: number;
  coinPoints: number;
  rhythmPoints: number;
  /** Coins and rhythm, in whole points. */
  points: number;
  /** Distance plus points. */
  score: number;
}

/**
 * The score of one run. It holds no Phaser: GameScene feeds it the player's
 * position every frame and each coin picked up.
 */
export class RunScore {
  /** The furthest the player got: only new ground scores. */
  furthestX: number;
  private readonly startX: number;
  private distancePoints = 0;
  private coinCount = 0;
  private coinPoints = 0;
  private bestCombo = 0;
  private combo = 0;
  private lastCoinAt = Number.NEGATIVE_INFINITY;
  private rhythmPoints = 0;
  /** How long the pace has held, and how long the player has been slower. */
  private paceMs = 0;
  private slowMs = 0;
  /** Only frames the run played add up: a paused or ended run gets none. */
  private elapsedMs = 0;

  constructor(startX: number) {
    this.startX = startX;
    this.furthestX = startX;
  }

  /**
   * Called every frame with where the player is.
   * @param topSpeed - the running speed at that point of the world
   */
  advance(playerX: number, deltaMs: number, topSpeed: number) {
    this.elapsedMs += deltaMs;
    const gained = Math.max(0, playerX - this.furthestX);
    this.furthestX += gained;

    const speed = deltaMs > 0 ? (gained * 1000) / deltaMs : 0;
    if (speed >= topSpeed * SCORING.RHYTHM_SPEED_SHARE) {
      this.slowMs = 0;
      this.paceMs += deltaMs;
    } else {
      this.slowMs += deltaMs;
      if (this.slowMs >= SCORING.RHYTHM_GRACE_MS) this.paceMs = 0;
    }

    const distance = Math.floor((this.furthestX - this.startX) / SCORING.PX_PER_POINT);
    if (this.inRhythm) this.rhythmPoints += (distance - this.distancePoints) * SCORING.RHYTHM_BONUS;
    this.distancePoints = distance;
  }

  /** The pace has held long enough and has not been broken since. */
  get inRhythm(): boolean {
    return this.paceMs >= SCORING.RHYTHM_AFTER_MS;
  }

  /** Scores a coin picked up at `now` and says what it was worth. */
  collectCoin(now: number): { combo: number; points: number } {
    this.combo = now - this.lastCoinAt < SCORING.COMBO_WINDOW_MS ? Math.min(this.combo + 1, SCORING.MAX_COMBO) : 1;
    this.lastCoinAt = now;

    const points = SCORING.COIN_POINTS + (this.combo - 1) * SCORING.COMBO_STEP_POINTS;
    this.coinCount++;
    this.coinPoints += points;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    return { combo: this.combo, points };
  }

  get distance(): number {
    return this.distancePoints;
  }

  get score(): number {
    return this.distancePoints + Math.floor(this.coinPoints + this.rhythmPoints);
  }

  get timeMs(): number {
    return this.elapsedMs;
  }

  summary(): RunSummary {
    const points = Math.floor(this.coinPoints + this.rhythmPoints);
    return {
      timeMs: this.elapsedMs,
      distance: this.distancePoints,
      coins: this.coinCount,
      maxCombo: this.bestCombo,
      coinPoints: this.coinPoints,
      rhythmPoints: this.rhythmPoints,
      points,
      score: this.distancePoints + points,
    };
  }
}

/** A run's time as minutes and seconds: 0:09, 1:01, 62:05. */
export function formatRunTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
