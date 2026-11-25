import { TestBed } from '@angular/core/testing';
import { GAME_STORE, type KeyValueStore, memoryStore } from '@app-persistence';
import { playMove } from './engine';
import { RingOutController } from './RingOutController.service';
import { ringOutProgress } from './ringout-saves';

describe('RingOutController', () => {
  let store: KeyValueStore;
  let controller: RingOutController;
  let now: number;

  function make(): RingOutController {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [RingOutController, { provide: GAME_STORE, useValue: store }],
    });
    const made = TestBed.inject(RingOutController);
    made.clock = () => now;
    return made;
  }

  /** Plays the solution of the level being played. */
  function solve(): void {
    for (const move of controller.levels[controller.level() - 1].solution) playMove(controller.board, move);
  }

  beforeEach(() => {
    store = memoryStore();
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
});
