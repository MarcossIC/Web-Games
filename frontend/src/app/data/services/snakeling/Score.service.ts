import { Injectable, computed, signal } from '@angular/core';
import { keepBest, persisted } from '@app-persistence';
import { SnakelingMode } from '@app/data/models/snakeling/Mode';
import { SnakelingRecords, snakelingRecords } from './snakeling-saves';
import {
  GOLDEN_APPLE_POINTS,
  applePoints,
  comboMultiplier,
  comboWindowMs,
} from './scoring';

export { POINTS_PER_APPLE } from './scoring';

/** Where each mode keeps its best score. */
const RECORD_FIELD: Record<SnakelingMode, keyof SnakelingRecords> = {
  portal: 'bestScore',
  classic: 'bestClassic',
  time: 'bestTimeAttack',
  hard: 'bestHard',
};

@Injectable()
export class ScoreService {
  private _score = signal(0);
  /** Apples eaten this game (golden ones are not counted). */
  private _apples = signal(0);
  /** Apples eaten in a row, each before the combo ran out. 0: no combo. */
  private _combo = signal(0);
  /** The longest combo of this game. */
  private _bestCombo = signal(0);
  /** Time left to eat the next apple and keep the combo going. */
  private _comboLeftMs = signal(0);
  private readonly records = persisted(snakelingRecords);

  /** The multiplier the combo gives the apple just eaten. */
  public readonly multiplier = computed(() => comboMultiplier(this._combo()));

  /** How much of the combo's time is left, 1 (all of it) to 0. */
  public readonly comboShare = computed(() => {
    const combo = this._combo();
    return combo === 0 ? 0 : this._comboLeftMs() / comboWindowMs(combo);
  });

  /** Saves the current score if it beats the best one of `mode`. */
  public updateMaxScore(mode: SnakelingMode): void {
    const best = keepBest(this.bestFor(mode), this._score(), 'higher');
    if (best.improved) {
      this.records.set({
        ...this.records.value(),
        [RECORD_FIELD[mode]]: best.value,
      });
    }
  }

  /**
   * An apple was eaten: it continues the combo if there was time left,
   * or starts a new one. Its points are multiplied by the combo.
   * @returns the points it gave
   */
  public eatApple(): number {
    const combo = this._comboLeftMs() > 0 ? this._combo() + 1 : 1;
    const points = applePoints(combo);
    this._combo.set(combo);
    this._bestCombo.update((best) => Math.max(best, combo));
    this._comboLeftMs.set(comboWindowMs(combo));
    this._apples.update((apples) => apples + 1);
    this._score.update((score) => score + points);
    return points;
  }

  /**
   * A golden apple was eaten. Its points are fixed, and it leaves the
   * combo as it was: it neither continues nor breaks it.
   * @returns the points it gave
   */
  public eatGoldenApple(): number {
    this._score.update((score) => score + GOLDEN_APPLE_POINTS);
    return GOLDEN_APPLE_POINTS;
  }

  /** Takes `elapsedMs` off the combo; when it runs out the combo is over. */
  public tick(elapsedMs: number): void {
    if (this._combo() === 0) return;
    const left = Math.max(0, this._comboLeftMs() - elapsedMs);
    this._comboLeftMs.set(left);
    if (left === 0) this._combo.set(0);
  }

  public resetScore(): void {
    this._score.set(0);
    this._apples.set(0);
    this._combo.set(0);
    this._bestCombo.set(0);
    this._comboLeftMs.set(0);
  }

  /** The best score ever made in `mode`. */
  public bestFor(mode: SnakelingMode): number {
    return this.records.value()[RECORD_FIELD[mode]];
  }

  public get score(): number {
    return this._score();
  }
  public set score(updated: number) {
    this._score.set(updated);
  }

  /** Apples eaten this game. */
  public get apples(): number {
    return this._apples();
  }

  /** Apples eaten in a row right now; 0 when there is no combo. */
  public get combo(): number {
    return this._combo();
  }

  /** The longest combo of this game. */
  public get bestCombo(): number {
    return this._bestCombo();
  }

  /** Time left to keep the combo going. */
  public get comboLeftMs(): number {
    return this._comboLeftMs();
  }
}
