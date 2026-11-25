import { computed, Injectable, signal } from '@angular/core';
import { persisted } from '@app-persistence';
import { Board, LEVELS, nextMove, type LevelSpec, type Piece } from './engine';
import { isUnlocked, recordClear, type ClearOutcome } from './ringout-progress';
import { ringOutProgress } from './ringout-saves';

/**
 * Where the player is: picking a level, playing one, paused in one, or
 * looking at the time of one just cleared.
 */
export type RingOutPhase = 'menu' | 'playing' | 'paused' | 'cleared';

/** A level just cleared, for the dialog that follows. */
export interface ClearResult extends ClearOutcome {
  readonly level: number;
  readonly timeMs: number;
}

/** The clock of the game: performance.now in the browser, anything in the tests. */
export type Clock = () => number;

/**
 * The game of Ring Out around the board: which level is played, its clock,
 * the levels open and the best times. The page moves the pieces on `board`
 * and tells the controller when it is cleared.
 *
 * The clock runs while a level is played and stops while it is paused: the
 * time of a level is the time spent looking at it.
 */
@Injectable()
export class RingOutController {
  readonly levels: readonly LevelSpec[] = LEVELS;

  private readonly saved = persisted(ringOutProgress);
  readonly progress = this.saved.value;

  private readonly _phase = signal<RingOutPhase>('menu');
  readonly phase = this._phase.asReadonly();

  /** The level played, from 1. */
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

  /** The board of the level played. The page changes it as pieces move. */
  board: Board = Board.load(LEVELS[0]);

  /** The tip of the level played, if it has one. */
  readonly tip = computed(() => this.levels[this._level() - 1]?.tip ?? null);
  readonly bestTime = computed(() => this.progress().bestTimes[this._level()] ?? null);
  readonly hasNext = computed(() => this._level() < this.levels.length);
  /** The first level not cleared yet, where the menu sends the player. */
  readonly nextToPlay = computed(() => Math.min(this.progress().cleared + 1, this.levels.length));

  /** Time counted before the clock last started. */
  private banked = 0;
  /** When the clock last started. */
  private runningSince = 0;

  /** Where the time comes from; the tests set their own. */
  clock: Clock = () => (typeof performance === 'undefined' ? Date.now() : performance.now());

  isUnlocked(level: number): boolean {
    return level <= this.levels.length && isUnlocked(this.progress(), level);
  }

  bestTimeOf(level: number): number | null {
    return this.progress().bestTimes[level] ?? null;
  }

  /** Lays out a level and starts its clock; a level still locked is not opened. */
  start(level: number): boolean {
    if (!this.isUnlocked(level)) return false;
    this._level.set(level);
    this.board = Board.load(this.levels[level - 1]);
    this.banked = 0;
    this.runningSince = this.clock();
    this._elapsed.set(0);
    this._result.set(null);
    this._phase.set('playing');
    this._round.update((round) => round + 1);
    return true;
  }

  /** The same level from the start, with the clock at zero. */
  retry(): void {
    this.start(this._level());
  }

  next(): void {
    if (this.hasNext()) this.start(this._level() + 1);
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
    this._phase.set('menu');
  }

  /** Moves the clock on: the page calls it as it draws. */
  tick(): void {
    if (this._phase() !== 'playing') return;
    this._elapsed.set(this.banked + this.clock() - this.runningSince);
  }

  /**
   * The board is cleared: the clock stops, the time is kept if it is the
   * best, and the next level opens.
   */
  finish(): ClearResult | null {
    if (this._phase() !== 'playing' || !this.board.cleared) return null;
    const timeMs = Math.max(1, Math.round(this.banked + this.clock() - this.runningSince));
    this._elapsed.set(timeMs);
    const outcome = recordClear(this.progress(), this._level(), timeMs);
    this.saved.set(outcome.progress);
    const result: ClearResult = { ...outcome, level: this._level(), timeMs };
    this._result.set(result);
    this._phase.set('cleared');
    return result;
  }

  /** A piece worth moving next, for the hint; null if none is found. */
  hint(): Piece | null {
    if (this._phase() !== 'playing') return null;
    const move = nextMove(this.board);
    if (move) return 'rod' in move ? { kind: 'rod', id: move.rod } : { kind: 'ring', id: move.ring };
    const turnable = this.board.rings.find((ring) => this.board.canTurn(ring.id));
    return turnable ? { kind: 'ring', id: turnable.id } : null;
  }
}
