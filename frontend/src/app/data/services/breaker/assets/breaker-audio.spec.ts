import { BREAKER_POWER_UPS } from '@app/data/models/breaker/BreakerKeys';
import { BreakerAudio } from './breaker-audio';

/** Calls every sound once. */
function playEverything(audio: BreakerAudio): void {
  audio.launch(480);
  audio.paddle(false);
  audio.paddle(true);
  audio.paddle(false, 0.9, 700);
  audio.wall();
  audio.wall(0);
  for (let combo = 1; combo <= 14; combo++) {
    audio.brick(combo);
  }
  for (const kind of ['normal', 'tough', 'armored', 'steel', 'explosive', 'capsule', 'prism'] as const) {
    audio.brick(1, kind, 300);
  }
  audio.brickHard();
  audio.brickHard(1, 200);
  audio.brickHard(3, 800);
  audio.steel();
  audio.explosion();
  audio.capsuleSpawn();
  for (const kind of BREAKER_POWER_UPS) {
    audio.powerUp(kind);
  }
  audio.laser();
  audio.ballLost();
  audio.barrier();
  audio.lifeLost();
  audio.lifeGained();
  audio.overdriveReady();
  audio.nova();
  audio.comboLost();
  audio.lastBrick();
  audio.sectorClear();
  audio.gameOver();
  audio.bossHit(0, false);
  audio.bossHit(1, false);
  audio.bossHit(2, true);
  audio.bossShot();
  audio.bossDown();
  audio.bossAlarm();
  audio.uiTick();
  audio.setSlowMotion(true);
  audio.setSlowMotion(false);
}

type Factory = 'createOscillator' | 'createStereoPanner' | 'createConvolver' | 'createBufferSource';

/** Spies on a node factory of the context and keeps every node it makes. */
function capture<K extends Factory>(ctx: AudioContext, method: K): ReturnType<AudioContext[K]>[] {
  const made: ReturnType<AudioContext[K]>[] = [];
  const original = (ctx[method] as (...args: unknown[]) => ReturnType<AudioContext[K]>).bind(ctx);
  spyOn(ctx as unknown as Record<string, () => unknown>, method).and.callFake(((...args: unknown[]) => {
    const node = original(...args);
    made.push(node);
    return node;
  }) as never);
  return made;
}

/**
 * A real audio graph that reports itself running. Headless Chrome never starts an
 * AudioContext without a gesture, so the specs drive an OfflineAudioContext (real nodes,
 * real scheduling, no device) through a proxy whose state is 'running'.
 */
function runningContext(): AudioContext {
  const offline = new OfflineAudioContext(1, 44100 * 2, 44100);
  let state: AudioContextState = 'running';
  return new Proxy(offline, {
    get(target, prop) {
      if (prop === 'state') {
        return state;
      }
      if (prop === 'resume') {
        return () => Promise.resolve();
      }
      if (prop === 'close') {
        return () => {
          state = 'closed';
          return Promise.resolve();
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, prop, value) {
      return Reflect.set(target, prop, value, target);
    },
  }) as unknown as AudioContext;
}

describe('BreakerAudio', () => {
  describe('mute', () => {
    it('starts with sound on unless told otherwise', () => {
      expect(new BreakerAudio({ createContext: () => null }).muted).toBeFalse();
      expect(new BreakerAudio({ muted: true, createContext: () => null }).muted).toBeTrue();
    });

    it('setMuted switches the flag', () => {
      const audio = new BreakerAudio({ createContext: () => null });

      audio.setMuted(true);
      expect(audio.muted).toBeTrue();
      audio.setMuted(false);
      expect(audio.muted).toBeFalse();
    });

    it('never reads or writes the storage: the controller owns the flag and sends it on READY', () => {
      const getItem = spyOn(localStorage, 'getItem').and.callThrough();
      const setItem = spyOn(localStorage, 'setItem').and.callThrough();

      const audio = new BreakerAudio({ createContext: () => null });
      audio.setMuted(true);

      expect(getItem).not.toHaveBeenCalled();
      expect(setItem).not.toHaveBeenCalled();
    });
  });

  describe('without an AudioContext', () => {
    it('makes every method a no-op', () => {
      const audio = new BreakerAudio({ createContext: () => null });

      expect(() => {
        audio.unlock();
        playEverything(audio);
        audio.setMuted(true);
        audio.destroy();
      }).not.toThrow();
      expect(audio.ready).toBeFalse();
    });

    it('survives a context constructor that throws', () => {
      const audio = new BreakerAudio({
        createContext: () => {
          throw new Error('no audio device');
        },
      });

      expect(() => {
        audio.unlock();
        playEverything(audio);
      }).not.toThrow();
      expect(audio.ready).toBeFalse();
    });
  });

  describe('with a real AudioContext', () => {
    let ctx: AudioContext;
    let audio: BreakerAudio;

    beforeEach(() => {
      ctx = runningContext();
      audio = new BreakerAudio({ createContext: () => ctx });
    });

    afterEach(async () => {
      await audio.destroy();
      if (ctx.state !== 'closed') {
        await ctx.close();
      }
    });

    it('creates no context and plays nothing before unlock', () => {
      const factory = jasmine.createSpy('createContext').and.returnValue(null);
      const locked = new BreakerAudio({ createContext: factory });

      playEverything(locked);

      expect(factory).not.toHaveBeenCalled();
    });

    it('creates its context once, however often it is unlocked', () => {
      const factory = jasmine.createSpy('createContext').and.callFake(() => ctx);
      const once = new BreakerAudio({ createContext: factory });

      once.unlock();
      once.unlock();
      once.unlock();

      expect(factory).toHaveBeenCalledTimes(1);
      // Not destroyed here: afterEach closes the shared context.
    });

    it('plays every sound without throwing', () => {
      audio.unlock();

      expect(audio.ready).toBeTrue();
      expect(() => playEverything(audio)).not.toThrow();
    });

    it('schedules nothing while muted', () => {
      audio.unlock();
      const oscillators = spyOn(ctx, 'createOscillator').and.callThrough();
      const noises = spyOn(ctx, 'createBufferSource').and.callThrough();

      audio.setMuted(true);
      playEverything(audio);

      expect(oscillators).not.toHaveBeenCalled();
      expect(noises).not.toHaveBeenCalled();

      audio.setMuted(false);
      audio.brick(1);

      expect(oscillators).toHaveBeenCalled();
    });

    it('rate-limits a burst of the same sound to one play', () => {
      audio.unlock();
      const oscillators = spyOn(ctx, 'createOscillator').and.callThrough();

      audio.wall();
      const onePlay = oscillators.calls.count();
      for (let i = 0; i < 20; i++) {
        audio.wall();
      }

      expect(onePlay).toBeGreaterThan(0);
      expect(oscillators.calls.count()).toBe(onePlay);
    });

    it('caps the voices of a multiball storm of bricks', () => {
      audio.unlock();
      const oscillators = spyOn(ctx, 'createOscillator').and.callThrough();
      const noises = spyOn(ctx, 'createBufferSource').and.callThrough();
      const realNow = performance.now();
      let fakeNow = realNow;
      spyOn(performance, 'now').and.callFake(() => fakeNow);

      // 60 different sounds in 60 ms: the interval would let most through, the cap must not.
      for (let i = 0; i < 60; i++) {
        fakeNow = realNow + i;
        audio.steel();
        audio.brickHard();
        audio.brick(i + 1);
      }

      expect(oscillators.calls.count() + noises.calls.count()).toBeLessThanOrEqual(BreakerAudio.MAX_VOICES);
    });
  });

  describe('space and feel', () => {
    let ctx: AudioContext;
    let audio: BreakerAudio;
    let fakeNow: number;
    let n: number;

    beforeEach(() => {
      ctx = runningContext();
      n = 0;
      // A random source that never repeats a value in a row.
      audio = new BreakerAudio({ createContext: () => ctx, random: () => (n++ * 0.37) % 1 });
      fakeNow = 1000;
      spyOn(performance, 'now').and.callFake(() => fakeNow);
    });

    afterEach(async () => {
      await audio.destroy();
      if (ctx.state !== 'closed') {
        await ctx.close();
      }
    });

    /** Past every sound's own interval. */
    const later = () => (fakeNow += 2000);

    it('pans a sound toward the side of the world it happened on', () => {
      audio.unlock();
      const panners = capture(ctx, 'createStereoPanner');

      audio.wall(0);
      later();
      audio.wall(960);

      expect(panners.length).toBe(2);
      expect(panners[0].pan.value).toBeCloseTo(-0.6, 2);
      expect(panners[1].pan.value).toBeCloseTo(0.6, 2);
    });

    it('keeps a sound with no place in the world in the center', () => {
      audio.unlock();
      const panners = capture(ctx, 'createStereoPanner');

      audio.sectorClear();
      audio.lifeLost();

      expect(panners.length).toBe(0);
    });

    it('varies the pitch of each wall hit a little, so a rally never repeats one sound', () => {
      audio.unlock();
      const oscillators = capture(ctx, 'createOscillator');

      audio.wall(100);
      later();
      audio.wall(100);

      expect(oscillators.length).toBe(2);
      expect(oscillators[0].detune.value).not.toBeCloseTo(oscillators[1].detune.value, 1);
      for (const osc of oscillators) {
        expect(Math.abs(osc.detune.value)).toBeLessThanOrEqual(BreakerAudio.MAX_VARY_CENTS);
      }
    });

    it('keeps the combo pling exactly on its note', () => {
      audio.unlock();
      const oscillators = capture(ctx, 'createOscillator');

      audio.brick(1, 'normal', 100);
      later();
      audio.brick(1, 'normal', 100);

      expect(oscillators.length).toBeGreaterThan(0);
      expect(oscillators.every((osc) => osc.detune.value === 0)).toBeTrue();
    });

    it('builds one reverb, however many sounds play', () => {
      const convolvers = capture(ctx, 'createConvolver');

      audio.unlock();
      playEverything(audio);

      expect(convolvers.length).toBe(1);
      expect(convolvers[0].buffer).not.toBeNull();
    });

    it('ducks the rest of the mix under a big moment, then lets it back up', () => {
      audio.unlock();
      const ramps = spyOn(AudioParam.prototype, 'linearRampToValueAtTime').and.callThrough();
      const targets = spyOn(AudioParam.prototype, 'setTargetAtTime').and.callThrough();
      const releases = () => targets.calls.all().filter((call) => call.args[0] === BreakerAudio.BUS_GAIN);

      audio.wall(100);
      expect(releases().length).toBe(0);

      audio.lastBrick(480);

      const ducked = ramps.calls.all().filter((call) => call.args[0] === BreakerAudio.DUCK_LEVEL);
      expect(ducked.length).toBe(1);
      expect(releases().length).toBe(1);
      expect(releases()[0].object).toBe(ducked[0].object);
    });

    it('muffles the mix in slow motion and opens it again after', () => {
      audio.unlock();
      const targets = spyOn(AudioParam.prototype, 'setTargetAtTime').and.callThrough();
      const cutoffs = () => targets.calls.all().map((call) => call.args[0]);

      audio.setSlowMotion(true);
      audio.setSlowMotion(true);
      expect(cutoffs()).toEqual([BreakerAudio.SLOW_CUTOFF_HZ]);

      audio.setSlowMotion(false);
      expect(cutoffs()).toEqual([BreakerAudio.SLOW_CUTOFF_HZ, BreakerAudio.OPEN_CUTOFF_HZ]);
    });

    it('breaks a tough or armored brick heavier than a normal one', () => {
      audio.unlock();
      const oscillators = capture(ctx, 'createOscillator');
      const noises = capture(ctx, 'createBufferSource');
      const voices = () => oscillators.length + noises.length;

      audio.brick(1, 'normal', 100);
      const normal = voices();
      later();
      audio.brick(1, 'tough', 100);
      const tough = voices() - normal;
      later();
      audio.brick(1, 'armored', 100);
      const armored = voices() - normal - tough;

      expect(tough).toBeGreaterThan(normal);
      expect(armored).toBeGreaterThan(tough);
    });

    it('adds a crack to a hard brick that is one hit from breaking', () => {
      audio.unlock();
      const noises = capture(ctx, 'createBufferSource');

      audio.brickHard(2, 100);
      const holding = noises.length;
      later();
      audio.brickHard(1, 100);

      expect(noises.length - holding).toBeGreaterThan(holding);
    });
  });
});
