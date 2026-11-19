import type { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BreakerBridgeEvents } from '@app/data/models/breaker/BreakerBridge';
import type { RunSummary } from '@app/data/services/breaker/engine/types';
import { EventBus } from '@app/data/services/phaser/EventBus';
import { BreakerControllerService } from './BreakerController.service';

const summary = (over: Partial<RunSummary> = {}): RunSummary => ({
  score: 4200,
  sector: 3,
  sectorsCleared: 2,
  timeMs: 90_000,
  bricksBroken: 80,
  maxCombo: 14,
  powerUpsCaught: 5,
  perfectHits: 3,
  sectorTimes: { 1: 30_000, 2: 40_000 },
  ...over,
});

/** A stand-in for the page's DestroyRef: `destroy()` plays the page dying. */
function fakeOwner(): DestroyRef & { destroy(): void } {
  let callbacks: (() => void)[] = [];
  return {
    destroyed: false,
    onDestroy(fn: () => void) {
      callbacks.push(fn);
      return () => (callbacks = callbacks.filter((c) => c !== fn));
    },
    destroy() {
      const run = callbacks;
      callbacks = [];
      run.forEach((fn) => fn());
    },
  } as unknown as DestroyRef & { destroy(): void };
}

describe('BreakerControllerService', () => {
  let controller: BreakerControllerService;
  let owner: ReturnType<typeof fakeOwner>;
  let emitted: { event: string; args: unknown[] }[];
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    spyOn(localStorage, 'getItem').and.callFake((k: string) => store[k] ?? null);
    spyOn(localStorage, 'setItem').and.callFake((k: string, v: string) => {
      store[k] = v;
    });
    emitted = [];
    spyOn(EventBus, 'emit').and.callFake(((event: string, ...args: unknown[]) => {
      emitted.push({ event, args });
      return true;
    }) as never);
    TestBed.configureTestingModule({ providers: [BreakerControllerService] });
    controller = TestBed.inject(BreakerControllerService);
    owner = fakeOwner();
    controller.connect(owner);
  });

  afterEach(() => owner.destroy());

  // The spy on emit swallows the events, so scene events are delivered by hand.
  const fromScene = (event: BreakerBridgeEvents, ...args: unknown[]) =>
    (EventBus.listeners(event) as ((...a: unknown[]) => void)[]).forEach((fn) => fn(...args));

  const key = (k: string, repeat = false, mods: Partial<Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey'>> = {}) =>
    ({ key: k, repeat, ctrlKey: false, metaKey: false, altKey: false, ...mods, preventDefault: () => {} }) as unknown as KeyboardEvent;

  const recordWrites = () => (localStorage.setItem as jasmine.Spy).calls.allArgs().filter(([k]) => k === 'breaker-records-v1').length;

  const sent = (event: BreakerBridgeEvents) => emitted.filter((e) => e.event === event);

  it('starts loading, with no summary and the saved records loaded', () => {
    expect(controller.phase()).toBe('loading');
    expect(controller.summary()).toBeNull();
    expect(controller.records().best).toBeNull();
  });

  it('READY moves to the intro', () => {
    fromScene(BreakerBridgeEvents.READY);
    expect(controller.phase()).toBe('intro');
  });

  it('play starts from the intro and from a pause, and emits PLAY', () => {
    fromScene(BreakerBridgeEvents.READY);
    controller.play();
    expect(controller.phase()).toBe('playing');
    controller.pause();
    controller.play();
    expect(controller.phase()).toBe('playing');
    expect(sent(BreakerBridgeEvents.PLAY).length).toBe(2);
  });

  it('play does nothing while loading or playing', () => {
    controller.play();
    expect(controller.phase()).toBe('loading');
    expect(sent(BreakerBridgeEvents.PLAY).length).toBe(0);
  });

  it('pause only works while playing and emits PAUSE', () => {
    controller.pause();
    expect(sent(BreakerBridgeEvents.PAUSE).length).toBe(0);
    fromScene(BreakerBridgeEvents.READY);
    controller.play();
    controller.pause();
    expect(controller.phase()).toBe('paused');
    expect(sent(BreakerBridgeEvents.PAUSE).length).toBe(1);
  });

  it('togglePause flips between playing and paused', () => {
    fromScene(BreakerBridgeEvents.READY);
    controller.play();
    controller.togglePause();
    expect(controller.phase()).toBe('paused');
    controller.togglePause();
    expect(controller.phase()).toBe('playing');
  });

  it('AUTO_PAUSED pauses without answering the scene', () => {
    fromScene(BreakerBridgeEvents.READY);
    controller.play();
    emitted.length = 0;
    fromScene(BreakerBridgeEvents.AUTO_PAUSED);
    expect(controller.phase()).toBe('paused');
    expect(emitted.length).toBe(0);
  });

  describe('PAUSE_REQUESTED (the HUD Pause button)', () => {
    it('pauses the run and tells the scene to freeze, like the P key does', () => {
      fromScene(BreakerBridgeEvents.READY);
      controller.play();
      emitted.length = 0;
      fromScene(BreakerBridgeEvents.PAUSE_REQUESTED);
      expect(controller.phase()).toBe('paused');
      expect(sent(BreakerBridgeEvents.PAUSE).length).toBe(1);
    });

    it('is ignored outside a run, while it is ending, and after the visit is over', () => {
      fromScene(BreakerBridgeEvents.READY);
      fromScene(BreakerBridgeEvents.PAUSE_REQUESTED);
      expect(controller.phase()).toBe('intro');
      controller.play();
      fromScene(BreakerBridgeEvents.RUN_ENDING);
      fromScene(BreakerBridgeEvents.PAUSE_REQUESTED);
      expect(controller.phase()).toBe('playing');
      owner.destroy();
      expect(EventBus.listenerCount(BreakerBridgeEvents.PAUSE_REQUESTED)).toBe(0);
    });
  });

  it('GAME_OVER stores the summary, records the run and moves to over', () => {
    fromScene(BreakerBridgeEvents.READY);
    controller.play();
    fromScene(BreakerBridgeEvents.GAME_OVER, summary());
    expect(controller.phase()).toBe('over');
    expect(controller.summary()?.score).toBe(4200);
    expect(controller.result()?.newBestScore).toBeTrue();
    expect(controller.result()?.newSectorBests).toEqual([1, 2]);
    expect(controller.records().best?.score).toBe(4200);
    expect(Object.keys(store).length).toBeGreaterThan(0);
  });

  it('a worse run is not a new best', () => {
    fromScene(BreakerBridgeEvents.GAME_OVER, summary());
    fromScene(BreakerBridgeEvents.GAME_OVER, summary({ score: 100, sectorTimes: {} }));
    expect(controller.result()?.newBestScore).toBeFalse();
    expect(controller.records().best?.score).toBe(4200);
  });

  it('restart works from over and from a pause, clears the result and emits RESTART', () => {
    fromScene(BreakerBridgeEvents.GAME_OVER, summary());
    controller.restart();
    expect(controller.phase()).toBe('playing');
    expect(controller.summary()).toBeNull();
    expect(controller.result()).toBeNull();
    controller.pause();
    controller.restart();
    expect(controller.phase()).toBe('playing');
    expect(sent(BreakerBridgeEvents.RESTART).length).toBe(2);
  });

  it('restart is ignored while playing', () => {
    fromScene(BreakerBridgeEvents.READY);
    controller.play();
    controller.restart();
    expect(sent(BreakerBridgeEvents.RESTART).length).toBe(0);
  });

  it('toggleMute flips the signal and emits SET_MUTED', () => {
    expect(controller.muted()).toBeFalse();
    controller.toggleMute();
    expect(controller.muted()).toBeTrue();
    expect(sent(BreakerBridgeEvents.SET_MUTED)[0].args).toEqual([true]);
  });

  it('a mute toggled before any scene exists is kept: stored, and sent when the scene announces READY', () => {
    expect(controller.phase()).toBe('loading');
    controller.toggleMute();
    expect(store['breaker-muted']).toBe('1');
    emitted.length = 0;
    fromScene(BreakerBridgeEvents.READY);
    expect(sent(BreakerBridgeEvents.SET_MUTED).map((e) => e.args)).toEqual([[true]]);
  });

  it('a scene created after an unmute is told sound is on', () => {
    controller.toggleMute();
    controller.toggleMute();
    emitted.length = 0;
    fromScene(BreakerBridgeEvents.READY);
    expect(sent(BreakerBridgeEvents.SET_MUTED).map((e) => e.args)).toEqual([[false]]);
    expect(store['breaker-muted']).toBe('0');
  });

  it('handleKey: P and Escape pause while playing and resume while paused', () => {
    fromScene(BreakerBridgeEvents.READY);
    controller.play();
    controller.handleKey(key('p'));
    expect(controller.phase()).toBe('paused');
    controller.handleKey(key('Escape'));
    expect(controller.phase()).toBe('playing');
    controller.handleKey(key('P'));
    expect(controller.phase()).toBe('paused');
  });

  describe('mouse capture', () => {
    const esc = (timeStamp: number) => ({ ...key('Escape'), timeStamp }) as unknown as KeyboardEvent;

    it('is on by default, and toggling it is stored', () => {
      expect(controller.captureMouse()).toBeTrue();
      controller.toggleCaptureMouse();
      expect(controller.captureMouse()).toBeFalse();
      expect(store['breaker-capture-mouse']).toBe('0');
      controller.toggleCaptureMouse();
      expect(store['breaker-capture-mouse']).toBe('1');
    });

    it('L switches the capture on and off, also mid-run, once per press', () => {
      fromScene(BreakerBridgeEvents.READY);
      controller.play();
      controller.handleKey(key('l'));
      expect(controller.captureMouse()).toBeFalse();
      controller.handleKey(key('L', true));
      expect(controller.captureMouse()).toBeFalse();
      controller.handleKey(key('L'));
      expect(controller.captureMouse()).toBeTrue();
      expect(controller.phase()).toBe('playing');
    });

    it('Ctrl+L is the browser address bar, not ours', () => {
      controller.handleKey(key('l', false, { ctrlKey: true }));
      expect(controller.captureMouse()).toBeTrue();
    });

    it('a lock broken by the browser while playing pauses the run', () => {
      fromScene(BreakerBridgeEvents.READY);
      controller.play();
      controller.lockLost(1000);
      expect(controller.phase()).toBe('paused');
      expect(sent(BreakerBridgeEvents.PAUSE).length).toBe(1);
    });

    it('a lost lock outside a run changes nothing', () => {
      fromScene(BreakerBridgeEvents.READY);
      controller.lockLost(1000);
      expect(controller.phase()).toBe('intro');
    });

    it('the Esc that broke the lock does not resume the run it just paused', () => {
      fromScene(BreakerBridgeEvents.READY);
      controller.play();
      controller.lockLost(1000);
      controller.handleKey(esc(1050));
      expect(controller.phase()).toBe('paused');
      // A later Esc is a real one: it resumes.
      controller.handleKey(esc(2000));
      expect(controller.phase()).toBe('playing');
    });
  });

  it('handleKey ignores a held key and unrelated keys', () => {
    fromScene(BreakerBridgeEvents.READY);
    controller.play();
    controller.handleKey(key('p', true));
    controller.handleKey(key('x'));
    expect(controller.phase()).toBe('playing');
  });

  it('handleKey does not toggle the pause from the intro', () => {
    fromScene(BreakerBridgeEvents.READY);
    controller.handleKey(key('Escape'));
    expect(controller.phase()).toBe('intro');
  });

  it('handleKey M toggles mute, once per press', () => {
    controller.handleKey(key('m'));
    expect(controller.muted()).toBeTrue();
    controller.handleKey(key('m', true));
    expect(controller.muted()).toBeTrue();
  });

  describe('one connection per page visit (the route injector outlives the page)', () => {
    it('removes its listeners when the page that connected it dies', () => {
      const before = EventBus.listenerCount(BreakerBridgeEvents.GAME_OVER);
      owner.destroy();
      expect(EventBus.listenerCount(BreakerBridgeEvents.GAME_OVER)).toBe(before - 1);
    });

    it('a second visit records each game over once, and a first best is still a new record', () => {
      owner.destroy();
      owner = fakeOwner();
      controller.connect(owner);
      fromScene(BreakerBridgeEvents.READY);
      controller.play();
      fromScene(BreakerBridgeEvents.GAME_OVER, summary());
      expect(recordWrites()).toBe(1);
      expect(controller.result()?.newBestScore).toBeTrue();
    });

    it('connecting twice does not double the listeners', () => {
      const before = EventBus.listenerCount(BreakerBridgeEvents.GAME_OVER);
      controller.connect(owner);
      expect(EventBus.listenerCount(BreakerBridgeEvents.GAME_OVER)).toBe(before);
      const other = fakeOwner();
      controller.connect(other);
      expect(EventBus.listenerCount(BreakerBridgeEvents.GAME_OVER)).toBe(before);
      other.destroy();
    });

    it('a new visit starts clean: loading, no summary or result, records and mute read again', () => {
      fromScene(BreakerBridgeEvents.GAME_OVER, summary());
      expect(controller.phase()).toBe('over');
      owner.destroy();
      store['breaker-muted'] = '1';
      store['breaker-records-v1'] = JSON.stringify({ version: 1, best: { score: 9999, sector: 7, timeMs: 1, date: '2026-01-01' }, bestSectorTimes: {}, bestCombo: 3 });
      owner = fakeOwner();
      controller.connect(owner);
      expect(controller.phase()).toBe('loading');
      expect(controller.summary()).toBeNull();
      expect(controller.result()).toBeNull();
      expect(controller.records().best?.score).toBe(9999);
      expect(controller.muted()).toBeTrue();
    });
  });

  describe('practice runs (started past sector 1)', () => {
    it('are shown but never recorded', () => {
      fromScene(BreakerBridgeEvents.READY);
      controller.play();
      fromScene(BreakerBridgeEvents.GAME_OVER, summary({ practice: true, score: 999_999 }));
      expect(controller.phase()).toBe('over');
      expect(controller.summary()?.practice).toBeTrue();
      expect(recordWrites()).toBe(0);
      expect(controller.result()).toBeNull();
      expect(controller.records().best).toBeNull();
    });
  });

  describe('the game-over delay', () => {
    it('refuses to pause once the scene said the run is ending', () => {
      fromScene(BreakerBridgeEvents.READY);
      controller.play();
      fromScene(BreakerBridgeEvents.RUN_ENDING);
      controller.pause();
      controller.handleKey(key('p'));
      fromScene(BreakerBridgeEvents.AUTO_PAUSED);
      expect(controller.phase()).toBe('playing');
      expect(sent(BreakerBridgeEvents.PAUSE).length).toBe(0);
      fromScene(BreakerBridgeEvents.GAME_OVER, summary());
      expect(controller.phase()).toBe('over');
    });

    it('pauses again in the next run after a restart', () => {
      fromScene(BreakerBridgeEvents.READY);
      controller.play();
      fromScene(BreakerBridgeEvents.RUN_ENDING);
      fromScene(BreakerBridgeEvents.GAME_OVER, summary());
      controller.restart();
      controller.pause();
      expect(controller.phase()).toBe('paused');
    });
  });

  it('handleKey ignores P, Esc and M with Ctrl, Cmd or Alt held', () => {
    fromScene(BreakerBridgeEvents.READY);
    controller.play();
    controller.handleKey(key('p', false, { ctrlKey: true }));
    expect(controller.phase()).toBe('playing');
    controller.handleKey(key('Escape', false, { altKey: true }));
    expect(controller.phase()).toBe('playing');
    controller.handleKey(key('p', false, { metaKey: true }));
    expect(controller.phase()).toBe('playing');
    controller.handleKey(key('m', false, { metaKey: true }));
    expect(controller.muted()).toBeFalse();
    controller.handleKey(key('m', false, { altKey: true }));
    expect(controller.muted()).toBeFalse();
  });

  it('removes exactly its own listeners on destroy', () => {
    const other = () => {};
    EventBus.on(BreakerBridgeEvents.READY, other);
    const before = EventBus.listenerCount(BreakerBridgeEvents.READY);
    TestBed.resetTestingModule();
    expect(EventBus.listenerCount(BreakerBridgeEvents.READY)).toBe(before - 1);
    expect(EventBus.listeners(BreakerBridgeEvents.READY)).toContain(other);
    EventBus.off(BreakerBridgeEvents.READY, other);
  });
});

describe('BreakerControllerService muted preference', () => {
  it('reads the saved mute state on start', () => {
    spyOn(localStorage, 'getItem').and.callFake((k: string) => (k === 'breaker-muted' ? '1' : null));
    TestBed.configureTestingModule({ providers: [BreakerControllerService] });
    expect(TestBed.inject(BreakerControllerService).muted()).toBeTrue();
  });
});

describe('BreakerControllerService mouse capture preference', () => {
  it('reads a saved off on start', () => {
    spyOn(localStorage, 'getItem').and.callFake((k: string) => (k === 'breaker-capture-mouse' ? '0' : null));
    TestBed.configureTestingModule({ providers: [BreakerControllerService] });
    expect(TestBed.inject(BreakerControllerService).captureMouse()).toBeFalse();
  });
});
