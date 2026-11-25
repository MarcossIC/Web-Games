import { computed, inject, Injectable, signal } from '@angular/core';
import { persisted } from '@app-persistence';
import { Board, GENERATOR_VERSION, LEVELS, nextMove, planNext, type LevelSpec, type Piece } from './engine';
import { forGenerator, isUnlocked, recordClear, type ClearOutcome, type RingOutProgress } from './ringout-progress';
import { ringOutInfinite, ringOutProgress } from './ringout-saves';
import { RingOutStages } from './ringout-stages';

/**
 * Where the player is: picking a level, waiting for a stage of Infinite to
 * be built, playing one, paused in one, or looking at the time of one just
 * cleared.
 */
export type RingOutPhase = 'menu' | 'building' | 'playing' | 'paused' | 'cleared';

/**
 * What is played: the levels made by hand, one after the other, or
 * Infinite, a new board built for every stage, each a little harder.
 */
export type RingOutMode = 'levels' | 'infinite';

/** A level or stage just cleared, for the dialog that follows. */
export interface ClearResult extends ClearOutcome {
  readonly mode: RingOutMode;
  /** The level or stage, from 1. */
  readonly level: number;
  readonly timeMs: number;
}

/** The clock of the game: performance.now in the browser, anything in the tests. */
export type Clock = () => number;

/** How many boards the hint may look at when the board needs turns in a row to open: it answers a tap. */
const HINT_BUDGET = 1500;

/**
 * The game of Ring Out around the board: what is played (a level, or a
 * stage of Infinite), its clock, what is open and the best times. The page
 * moves the pieces on `board` and tells the controller when it is cleared.
 *
 * The clock runs while a level is played and stops while it is paused: the
 * time of a level is the time spent looking at it. A stage of Infinite
 * that is still being built has no clock yet.
 */
@Injectable()
export class RingOutController {
  readonly levels: readonly LevelSpec[] = LEVELS;

  private readonly stages = inject(RingOutStages);

  private readonly saved = persisted(ringOutProgress);
  readonly progress = this.saved.value;

  private readonly savedInfinite = persisted(ringOutInfinite);
  /** Infinite as it stands for this generator: times kept for boards it no longer builds are gone. */
  readonly infiniteProgress = computed(() => forGenerator(this.savedInfinite.value(), GENERATOR_VERSION));

  private readonly _mode = signal<RingOutMode>('levels');
  readonly mode = this._mode.asReadonly();

  private readonly _phase = signal<RingOutPhase>('menu');
  readonly phase = this._phase.asReadonly();

  /** The level or stage played, from 1. */
  private readonly _level = signal(1);
  readonly level = this._level.asReadonly();

  private readonly _elapsed = signal(0);
  /** Time on the clock, in milliseconds. */
  readonly elapsedMs = this._elapsed.asReadonly();

  private readonly _result = signal<ClearResult | null>(null);
  readonly result = this._result.asReadonly();

  /** Grows each time a level is laid out: the page fits the new board to the screen. */
  private readonly _round = signal(0);
  readonly round = this._round.asReadonly();

  /** The board played. The page changes it as pieces move. */
  board: Board = Board.load(LEVELS[0]);

  /** The tip of the level played, if it has one. Stages of Infinite have none. */
  readonly tip = computed(() =>
    this._mode() === 'levels' ? (this.levels[this._level() - 1]?.tip ?? null) : null
  );
  readonly bestTime = computed(() => this.progressOf(this._mode()).bestTimes[this._level()] ?? null);
  readonly hasNext = computed(() => this._mode() === 'infinite' || this._level() < this.levels.length);
  /** The first level not cleared yet, where the menu sends the player. */
  readonly nextToPlay = computed(() => Math.min(this.progress().cleared + 1, this.levels.length));
  /** The stage of Infinite the player goes on from: the one after the furthest cleared. */
  readonly nextStage = computed(() => this.infiniteProgress().cleared + 1);

  /** Time counted before the clock last started. */
  private banked = 0;
  /** When the clock last started. */
  private runningSince = 0;
  /** Counts the stages asked for: a board built for an older ask is not laid out. */
  private ask = 0;

  /** Where the time comes from; the tests set their own. */
  clock: Clock = () => (typeof performance === 'undefined' ? Date.now() : performance.now());

  isUnlocked(level: number): boolean {
    return level <= this.levels.length && isUnlocked(this.progress(), level);
  }

  bestTimeOf(level: number): number | null {
    return this.progress().bestTimes[level] ?? null;
  }

  /** The best time of the level or stage `level` in the mode played now. */
  bestTimeHere(level: number): number | null {
    return this.progressOf(this._mode()).bestTimes[level] ?? null;
  }

  /** Lays out a level and starts its clock; a level still locked is not opened. */
  start(level: number): boolean {
    if (!this.isUnlocked(level)) return false;
    this.ask++;
    this._mode.set('levels');
    this.layOut(level, this.levels[level - 1]);
    return true;
  }

  /**
   * Plays a stage of Infinite, by default the one after the furthest
   * cleared; one further on is not opened. If its board is still being
   * built, the phase is `building` until it is.
   */
  startInfinite(stage: number = this.nextStage()): boolean {
    if (!isUnlocked(this.infiniteProgress(), stage)) return false;
    const ask = ++this.ask;
    this._mode.set('infinite');
    this._level.set(stage);
    this._result.set(null);
    const ready = this.stages.peek(stage);
    if (ready) {
      this.layOut(stage, ready);
      return true;
    }
    this._elapsed.set(0);
    this._phase.set('building');
    this.stages.get(stage).then((level) => {
      if (ask === this.ask && this._phase() === 'building') this.layOut(stage, level);
    });
    return true;
  }

  /** Starts building the stage Infinite goes on from, so it is ready when the player picks it. */
  prepareInfinite(): void {
    this.stages.prefetch(this.nextStage());
  }

  /** The same level or stage from the start, with the clock at zero. */
  retry(): void {
    if (this._mode() === 'infinite') this.startInfinite(this._level());
    else this.start(this._level());
  }

  next(): void {
    if (!this.hasNext()) return;
    if (this._mode() === 'infinite') this.startInfinite(this._level() + 1);
    else this.start(this._level() + 1);
  }

  pause(): void {
    if (this._phase() !== 'playing') return;
    this.banked += this.clock() - this.runningSince;
    this._elapsed.set(this.banked);
    this._phase.set('paused');
  }

  resume(): void {
    if (this._phase() !== 'paused') return;
    this.runningSince = this.clock();
    this._phase.set('playing');
  }

  /** Pause or resume, for the key and the button that do both. */
  togglePause(): void {
    if (this._phase() === 'playing') this.pause();
    else if (this._phase() === 'paused') this.resume();
  }

  backToMenu(): void {
    if (this._phase() === 'playing') this.pause();
    // A stage still being built is not laid out once the player has left it.
    this.ask++;
    this._phase.set('menu');
  }

  /** Moves the clock on: the page calls it as it draws. */
  tick(): void {
    if (this._phase() !== 'playing') return;
    this._elapsed.set(this.banked + this.clock() - this.runningSince);
  }

  /**
   * The board is cleared: the clock stops, the time is kept if it is the
   * best, and the next level or stage opens.
   */
  finish(): ClearResult | null {
    if (this._phase() !== 'playing' || !this.board.cleared) return null;
    const timeMs = Math.max(1, Math.round(this.banked + this.clock() - this.runningSince));
    this._elapsed.set(timeMs);
    const mode = this._mode();
    const outcome = recordClear(this.progressOf(mode), this._level(), timeMs);
    if (mode === 'infinite') this.savedInfinite.set({ ...outcome.progress, generator: GENERATOR_VERSION });
    else this.saved.set(outcome.progress);
    const result: ClearResult = { ...outcome, mode, level: this._level(), timeMs };
    this._result.set(result);
    this._phase.set('cleared');
    return result;
  }

  /**
   * A piece worth moving next, for the hint; null if none is found. The
   * quick look first; if it sees nothing, a longer one for boards that
   * need several turns in a row to open a way.
   */
  hint(): Piece | null {
    if (this._phase() !== 'playing') return null;
    const move = nextMove(this.board) ?? planNext(this.board, { budget: HINT_BUDGET });
    if (move) return 'rod' in move ? { kind: 'rod', id: move.rod } : { kind: 'ring', id: move.ring };
    const turnable = this.board.rings.find((ring) => this.board.canTurn(ring.id));
    return turnable ? { kind: 'ring', id: turnable.id } : null;
  }

  private progressOf(mode: RingOutMode): RingOutProgress {
    return mode === 'infinite' ? this.infiniteProgress() : this.progress();
  }

  /** Puts a board on the table and starts its clock. */
  private layOut(level: number, spec: LevelSpec): void {
    this._level.set(level);
    this.board = Board.load(spec);
    this.banked = 0;
    this.runningSince = this.clock();
    this._elapsed.set(0);
    this._result.set(null);
    this._phase.set('playing');
    this._round.update((round) => round + 1);
    // While this stage is played, the next one is built.
    if (this._mode() === 'infinite') this.stages.prefetch(level + 1);
  }
}
