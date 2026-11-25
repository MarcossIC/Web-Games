import { Injectable, OnDestroy } from '@angular/core';
import { answerStageRequest, type StageReply, type StageRequest } from './engine/generator';
import type { LevelSpec } from './engine';

/** Boards kept once built: the stage played, the one after, and a couple before. */
const KEEP = 4;

/**
 * The boards of Infinite, built in a worker so the page stays responsive
 * while a stage is proven clearable; where there are no workers they are
 * built on the page. A stage asked for twice is built once, and the boards
 * of the last few stages are kept, so playing a stage again starts at once.
 */
@Injectable()
export class RingOutStages implements OnDestroy {
  private worker: Worker | null = null;
  /** False once a worker could not be had: boards are built on the page from then on. */
  private canUseWorker = typeof Worker !== 'undefined';
  private readonly built = new Map<number, LevelSpec>();
  /** Stages being built, with whoever waits for each. */
  private readonly building = new Map<number, ((level: LevelSpec) => void)[]>();

  /** The board of a stage if it is built already, else null. */
  peek(stage: number): LevelSpec | null {
    return this.built.get(stage) ?? null;
  }

  /** The board of a stage: at once if it is built, else once it is. */
  get(stage: number): Promise<LevelSpec> {
    const ready = this.built.get(stage);
    if (ready) return Promise.resolve(ready);
    return new Promise((resolve) => this.build(stage, resolve));
  }

  /** Starts building a stage before it is asked for, so it is ready when it is. */
  prefetch(stage: number): void {
    if (!this.built.has(stage)) this.build(stage);
  }

  ngOnDestroy(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  private build(stage: number, resolve?: (level: LevelSpec) => void): void {
    const waiting = this.building.get(stage);
    if (waiting) {
      if (resolve) waiting.push(resolve);
      return;
    }
    this.building.set(stage, resolve ? [resolve] : []);
    this.send({ stage });
  }

  private send(request: StageRequest): void {
    const worker = this.startWorker();
    if (worker) worker.postMessage(request);
    // On the page, after the caller has gone on: it expects an answer later, not now.
    else setTimeout(() => this.receive(answerStageRequest(request)), 0);
  }

  private receive({ stage, level }: StageReply): void {
    const waiting = this.building.get(stage) ?? [];
    this.building.delete(stage);
    this.built.delete(stage);
    this.built.set(stage, level);
    // A Map keeps the order things went in: the first are the oldest.
    for (const old of this.built.keys()) {
      if (this.built.size <= KEEP) break;
      this.built.delete(old);
    }
    for (const resolve of waiting) resolve(level);
  }

  private startWorker(): Worker | null {
    if (this.worker || !this.canUseWorker) return this.worker;
    try {
      const worker = new Worker(new URL('./engine/ringout-stages.worker', import.meta.url), { type: 'module' });
      worker.addEventListener('message', ({ data }: MessageEvent<StageReply>) => this.receive(data));
      worker.addEventListener('error', () => this.giveUpOnWorker());
      this.worker = worker;
    } catch {
      this.canUseWorker = false;
    }
    return this.worker;
  }

  /** The worker failed to load or broke: what was asked of it is built on the page. */
  private giveUpOnWorker(): void {
    this.canUseWorker = false;
    this.worker?.terminate();
    this.worker = null;
    for (const stage of this.building.keys()) this.send({ stage });
  }
}
