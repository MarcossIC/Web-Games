import { TestBed } from '@angular/core/testing';
import { GAME_STORE, type KeyValueStore, memoryStore } from '@app-persistence';
import { GENERATOR_VERSION, LEVELS, playMove, type LevelSpec } from './engine';
import { RingOutController } from './RingOutController.service';
import { ringOutInfinite, ringOutProgress } from './ringout-saves';
import { RingOutStages } from './ringout-stages';

/**
 * Stands in for the worker that builds Infinite: stage n is level n made by
 * hand, and a board is handed over only when the test says so.
 */
class FakeStages {
  readonly built = new Map<number, LevelSpec>();
  readonly asked: number[] = [];
  readonly prefetched: number[] = [];
  private readonly waiting = new Map<number, (level: LevelSpec) => void>();

  peek(stage: number): LevelSpec | null {
    return this.built.get(stage) ?? null;
  }

  get(stage: number): Promise<LevelSpec> {
    this.asked.push(stage);
    const ready = this.built.get(stage);
    return ready ? Promise.resolve(ready) : new Promise((resolve) => this.waiting.set(stage, resolve));
  }

  prefetch(stage: number): void {
    this.prefetched.push(stage);
  }

  /** The worker answers: the board of `stage` is built. */
  async finish(stage: number): Promise<void> {
    const level = LEVELS[stage - 1];
    this.built.set(stage, level);
    this.waiting.get(stage)?.(level);
    this.waiting.delete(stage);
    await Promise.resolve();
  }
}

describe('RingOutController', () => {
  let store: KeyValueStore;
  let stages: FakeStages;
  let controller: RingOutController;
  let now: number;

  function make(): RingOutController {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        RingOutController,
        { provide: GAME_STORE, useValue: store },
        { provide: RingOutStages, useValue: stages },
      ],
    });
    const made = TestBed.inject(RingOutController);
    made.clock = () => now;
    return made;
  }

  /** Plays the solution of the level being played (stage n of the fake Infinite is level n). */
  function solve(): void {
    for (const move of controller.levels[controller.level() - 1].solution) playMove(controller.board, move);
  }

  beforeEach(() => {
    store = memoryStore();
    stages = new FakeStages();
    now = 1000;
    controller = make();
  });

  it('opens on the menu with only the first level open', () => {
    expect(controller.phase()).toBe('menu');
    expect(controller.isUnlocked(1)).toBeTrue();
    expect(controller.isUnlocked(2)).toBeFalse();
    expect(controller.nextToPlay()).toBe(1);
  });

  it('does not open a locked level', () => {
    expect(controller.start(2)).toBeFalse();
    expect(controller.phase()).toBe('menu');
  });

  it('runs the clock while playing and stops it while paused', () => {
    controller.start(1);
    now += 2000;
    controller.tick();
    expect(controller.elapsedMs()).toBe(2000);

    controller.pause();
    expect(controller.phase()).toBe('paused');
    now += 10_000;
    controller.tick();
    expect(controller.elapsedMs()).toBe(2000);

    controller.resume();
    now += 500;
    controller.tick();
    expect(controller.elapsedMs()).toBe(2500);
  });

  it('keeps the time of a clear, opens the next level and saves both', () => {
    controller.start(1);
    now += 4200;
    solve();
    const result = controller.finish();
    expect(result).toEqual(jasmine.objectContaining({ level: 1, timeMs: 4200, newBest: true, unlocked: true }));
    expect(controller.phase()).toBe('cleared');
    expect(controller.isUnlocked(2)).toBeTrue();
    expect(ringOutProgress.read(store)).toEqual({ cleared: 1, bestTimes: { 1: 4200 } });
  });

  it('does not finish a level that is not cleared', () => {
    controller.start(1);
    expect(controller.finish()).toBeNull();
    expect(controller.phase()).toBe('playing');
  });

  it('starts the level again with a new board and the clock at zero', () => {
    controller.start(1);
    const first = controller.board;
    const round = controller.round();
    now += 3000;
    controller.tick();
    controller.retry();
    expect(controller.board).not.toBe(first);
    expect(controller.round()).toBe(round + 1);
    expect(controller.elapsedMs()).toBe(0);
    expect(controller.phase()).toBe('playing');
  });

  it('keeps the best time when a level is played again slower', () => {
    controller.start(1);
    now += 3000;
    solve();
    controller.finish();

    controller.retry();
    now += 5000;
    solve();
    const result = controller.finish();
    expect(result?.newBest).toBeFalse();
    expect(result?.previousBest).toBe(3000);
    expect(controller.bestTimeOf(1)).toBe(3000);
  });

  it('goes on to the next level', () => {
    controller.start(1);
    solve();
    controller.finish();
    controller.next();
    expect(controller.level()).toBe(2);
    expect(controller.phase()).toBe('playing');
  });

  it('remembers progress between visits', () => {
    controller.start(1);
    solve();
    controller.finish();
    const again = make();
    expect(again.isUnlocked(2)).toBeTrue();
    expect(again.nextToPlay()).toBe(2);
  });

  it('points a hint at a piece that can move', () => {
    controller.start(2);
    expect(controller.hint()).toBeNull(); // level 2 is locked: nothing is played
    controller.start(1);
    expect(controller.hint()).toEqual({ kind: 'ring', id: 1 });
  });

  describe('Infinite', () => {
    it('opens on stage 1, and waits for its board while it is built', async () => {
      expect(controller.nextStage()).toBe(1);
      expect(controller.startInfinite()).toBeTrue();
      expect(controller.mode()).toBe('infinite');
      expect(controller.phase()).toBe('building');
      expect(stages.asked).toEqual([1]);

      await stages.finish(1);
      expect(controller.phase()).toBe('playing');
      expect(controller.level()).toBe(1);
      expect(controller.board.remaining).toBe(LEVELS[0].rings.length);
      expect(controller.tip()).toBeNull();
    });

    it('starts the clock only once the board is on the table', async () => {
      controller.startInfinite();
      now += 5000;
      controller.tick();
      expect(controller.elapsedMs()).toBe(0);
      await stages.finish(1);
      now += 1500;
      controller.tick();
      expect(controller.elapsedMs()).toBe(1500);
    });

    it('builds the next stage while this one is played', async () => {
      controller.startInfinite();
      await stages.finish(1);
      expect(stages.prefetched).toContain(2);
    });

    it('keeps the time of a clear apart from the levels, and goes on to a harder stage', async () => {
      controller.startInfinite();
      await stages.finish(1);
      now += 3200;
      solve();
      const result = controller.finish();
      expect(result).toEqual(jasmine.objectContaining({ mode: 'infinite', level: 1, timeMs: 3200, unlocked: true }));
      expect(ringOutInfinite.read(store)).toEqual({ cleared: 1, bestTimes: { 1: 3200 }, generator: GENERATOR_VERSION });
      expect(ringOutProgress.read(store)).toEqual({ cleared: 0, bestTimes: {} });
      expect(controller.hasNext()).toBeTrue();

      controller.next();
      expect(controller.level()).toBe(2);
      expect(controller.phase()).toBe('building');
      await stages.finish(2);
      expect(controller.phase()).toBe('playing');
    });

    it('plays a stage again at once: its board is already built', async () => {
      controller.startInfinite();
      await stages.finish(1);
      stages.asked.length = 0;
      controller.retry();
      expect(controller.phase()).toBe('playing');
      expect(stages.asked).toEqual([]);
    });

    it('does not open a stage further on than the one after the furthest cleared', () => {
      expect(controller.startInfinite(3)).toBeFalse();
      expect(controller.phase()).toBe('menu');
    });

    it('goes on from where the player got, on another visit', async () => {
      ringOutInfinite.write(store, { cleared: 4, bestTimes: { 4: 8000 }, generator: GENERATOR_VERSION });
      controller = make();
      expect(controller.nextStage()).toBe(5);
      controller.startInfinite();
      await stages.finish(5);
      expect(controller.level()).toBe(5);
      expect(controller.bestTimeHere(4)).toBe(8000);
    });

    it('forgets best times kept for boards an older generator built, not how far the player got', () => {
      ringOutInfinite.write(store, { cleared: 4, bestTimes: { 4: 8000 }, generator: GENERATOR_VERSION + 1 });
      controller = make();
      expect(controller.nextStage()).toBe(5);
      expect(controller.infiniteProgress().bestTimes).toEqual({});
    });

    it('does not lay out a board that arrives after the player went back to the menu', async () => {
      controller.startInfinite();
      controller.backToMenu();
      await stages.finish(1);
      expect(controller.phase()).toBe('menu');
    });

    it('starts building the stage the menu leads to', () => {
      controller.prepareInfinite();
      expect(stages.prefetched).toEqual([1]);
    });

    it('goes back to the levels with a level picked from the menu', async () => {
      controller.startInfinite();
      await stages.finish(1);
      controller.backToMenu();
      controller.start(1);
      expect(controller.mode()).toBe('levels');
      expect(controller.tip()).toContain('Tap a ring');
    });
  });
});
