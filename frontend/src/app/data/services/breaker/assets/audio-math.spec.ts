import {
  comboNoteIndex,
  fillBrownNoise,
  fillImpulseResponse,
  hardHitFrequency,
  MUTED_STORAGE_KEY,
  paddleFrequency,
  panForX,
  spread,
  parseMuted,
  pentatonicFrequency,
  serializeMuted,
  SoundGate,
} from './audio-math';

describe('breaker audio math', () => {
  describe('pentatonicFrequency', () => {
    const C5 = 523.2511;

    it('starts the combo on the base note (C5 by default)', () => {
      expect(pentatonicFrequency(0)).toBeCloseTo(C5, 2);
    });

    it('climbs the major pentatonic scale: C D E G A, then the next C', () => {
      const ratios = [0, 2, 4, 7, 9, 12].map((semitones) => Math.pow(2, semitones / 12));
      ratios.forEach((ratio, step) => {
        expect(pentatonicFrequency(step)).withContext(`step ${step}`).toBeCloseTo(C5 * ratio, 2);
      });
    });

    it('takes another base note', () => {
      expect(pentatonicFrequency(0, 440)).toBeCloseTo(440, 5);
      expect(pentatonicFrequency(5, 440)).toBeCloseTo(880, 5);
    });

    it('never goes above its top octave: past the cap it cycles the top octave', () => {
      // Two octaves: steps 0..9 climb, step 10 wraps to the start of the top octave.
      expect(pentatonicFrequency(10, 440, 2)).toBeCloseTo(880, 5);
      expect(pentatonicFrequency(11, 440, 2)).toBeCloseTo(pentatonicFrequency(6, 440, 2), 5);
      for (let step = 0; step < 200; step++) {
        expect(pentatonicFrequency(step, 440, 2)).toBeLessThan(440 * 4);
      }
    });

    it('treats a negative, fractional or non-finite step as the nearest valid one', () => {
      expect(pentatonicFrequency(-3)).toBeCloseTo(C5, 2);
      expect(pentatonicFrequency(Number.NaN)).toBeCloseTo(C5, 2);
      expect(pentatonicFrequency(2.9)).toBeCloseTo(pentatonicFrequency(2), 5);
    });
  });

  describe('comboNoteIndex', () => {
    it('maps the combo count of a brick-destroyed event (1 = first brick) to a scale step', () => {
      expect(comboNoteIndex(1)).toBe(0);
      expect(comboNoteIndex(2)).toBe(1);
      expect(comboNoteIndex(0)).toBe(0);
      expect(comboNoteIndex(-5)).toBe(0);
      expect(comboNoteIndex(Number.NaN)).toBe(0);
    });
  });

  describe('SoundGate', () => {
    it('lets a sound play once per interval', () => {
      const gate = new SoundGate({ maxVoices: 24, defaultIntervalMs: 30 });

      expect(gate.tryPlay('wall', 0, 1, 50)).toBeTrue();
      expect(gate.tryPlay('wall', 10, 1, 50)).toBeFalse();
      expect(gate.tryPlay('wall', 29, 1, 50)).toBeFalse();
      expect(gate.tryPlay('wall', 30, 1, 50)).toBeTrue();
    });

    it('keeps one interval per sound, with overrides', () => {
      const gate = new SoundGate({ maxVoices: 24, defaultIntervalMs: 30, intervalsMs: { laser: 80 } });

      expect(gate.tryPlay('laser', 0, 1, 50)).toBeTrue();
      expect(gate.tryPlay('wall', 0, 1, 50)).toBeTrue();
      expect(gate.tryPlay('wall', 40, 1, 50)).toBeTrue();
      expect(gate.tryPlay('laser', 40, 1, 50)).toBeFalse();
      expect(gate.tryPlay('laser', 80, 1, 50)).toBeTrue();
    });

    it('refuses a sound that would go over the voice cap until earlier voices have ended', () => {
      const gate = new SoundGate({ maxVoices: 4, defaultIntervalMs: 0 });

      expect(gate.tryPlay('a', 0, 3, 100)).toBeTrue();
      expect(gate.activeVoices(0)).toBe(3);
      expect(gate.tryPlay('b', 0, 2, 100)).toBeFalse();
      expect(gate.tryPlay('c', 0, 1, 300)).toBeTrue();
      expect(gate.activeVoices(50)).toBe(4);

      // 'a' ends at 100 ms: its 3 voices are free again, 'c' still sounds.
      expect(gate.activeVoices(100)).toBe(1);
      expect(gate.tryPlay('b', 100, 2, 100)).toBeTrue();
      expect(gate.activeVoices(400)).toBe(0);
    });

    it('frees voices by their scheduled end, so a suspended audio clock never jams the cap', () => {
      const gate = new SoundGate({ maxVoices: 2, defaultIntervalMs: 0 });
      gate.tryPlay('a', 0, 2, 80);

      expect(gate.tryPlay('b', 79, 1, 80)).toBeFalse();
      expect(gate.tryPlay('b', 80, 1, 80)).toBeTrue();
    });

    it('lets a priority sound past the voice cap, but not past its own interval', () => {
      const gate = new SoundGate({ maxVoices: 2, defaultIntervalMs: 100 });
      gate.tryPlay('brick', 0, 2, 500);

      expect(gate.tryPlay('lifeLost', 0, 3, 500, true)).toBeTrue();
      expect(gate.tryPlay('lifeLost', 50, 3, 500, true)).toBeFalse();
    });

    it('does not record a refused play, so the sound can try again at once', () => {
      const gate = new SoundGate({ maxVoices: 1, defaultIntervalMs: 30 });
      gate.tryPlay('a', 0, 1, 6);

      expect(gate.tryPlay('b', 5, 1, 10)).toBeFalse();
      expect(gate.tryPlay('b', 6, 1, 10)).toBeTrue();
    });

    it('forgets every voice and every last play on reset', () => {
      const gate = new SoundGate({ maxVoices: 2, defaultIntervalMs: 1000 });
      gate.tryPlay('a', 0, 2, 5000);

      gate.reset();

      expect(gate.activeVoices(1)).toBe(0);
      expect(gate.tryPlay('a', 1, 2, 5000)).toBeTrue();
    });
  });

  describe('mute persistence', () => {
    it('stores under breaker-muted', () => {
      expect(MUTED_STORAGE_KEY).toBe('breaker-muted');
    });

    it('round-trips both values', () => {
      expect(parseMuted(serializeMuted(true))).toBeTrue();
      expect(parseMuted(serializeMuted(false))).toBeFalse();
    });

    it('reads "1" and "true" as muted', () => {
      expect(parseMuted('1')).toBeTrue();
      expect(parseMuted('true')).toBeTrue();
      expect(parseMuted(' TRUE ')).toBeTrue();
    });

    it('reads anything else, missing or garbage, as not muted', () => {
      for (const raw of [null, undefined, '', '0', 'false', 'NaN', '{"muted":true}', 'yes']) {
        expect(parseMuted(raw)).withContext(String(raw)).toBeFalse();
      }
    });
  });

  describe('panForX', () => {
    it('puts the middle of the 960 px world in the center', () => {
      expect(panForX(480)).toBeCloseTo(0, 5);
    });

    it('pans the left wall left and the right wall right, never all the way', () => {
      expect(panForX(0)).toBeCloseTo(-0.6, 5);
      expect(panForX(960)).toBeCloseTo(0.6, 5);
      expect(panForX(240)).toBeCloseTo(-0.3, 5);
    });

    it('clamps a position outside the world and centers a missing one', () => {
      expect(panForX(-500)).toBeCloseTo(-0.6, 5);
      expect(panForX(5000)).toBeCloseTo(0.6, 5);
      expect(panForX(undefined)).toBe(0);
      expect(panForX(Number.NaN)).toBe(0);
    });

    it('takes another width and spread', () => {
      expect(panForX(100, 100, 1)).toBeCloseTo(1, 5);
    });
  });

  describe('spread', () => {
    it('maps the random source 0..1 onto -amount..amount', () => {
      expect(spread(() => 0, 30)).toBeCloseTo(-30, 5);
      expect(spread(() => 0.5, 30)).toBeCloseTo(0, 5);
      expect(spread(() => 0.999999, 30)).toBeCloseTo(30, 3);
    });
  });

  describe('hardHitFrequency', () => {
    it('rings higher the closer the brick is to breaking', () => {
      expect(hardHitFrequency(1)).toBeGreaterThan(hardHitFrequency(2));
      expect(hardHitFrequency(2)).toBeGreaterThan(hardHitFrequency(3));
    });

    it('treats a missing or broken hp as the nearest valid one', () => {
      expect(hardHitFrequency(0)).toBeCloseTo(hardHitFrequency(1), 5);
      expect(hardHitFrequency(Number.NaN)).toBeCloseTo(hardHitFrequency(2), 5);
      expect(hardHitFrequency(99)).toBeCloseTo(hardHitFrequency(4), 5);
    });
  });

  describe('paddleFrequency', () => {
    it('thumps lowest in the middle and brightens toward either edge, the same on both sides', () => {
      expect(paddleFrequency(0)).toBeCloseTo(180, 5);
      expect(paddleFrequency(1)).toBeGreaterThan(paddleFrequency(0.5));
      expect(paddleFrequency(0.5)).toBeGreaterThan(paddleFrequency(0));
      expect(paddleFrequency(-0.7)).toBeCloseTo(paddleFrequency(0.7), 5);
    });

    it('clamps the offset to the paddle and centers a missing one', () => {
      expect(paddleFrequency(3)).toBeCloseTo(paddleFrequency(1), 5);
      expect(paddleFrequency(Number.NaN)).toBeCloseTo(180, 5);
    });
  });

  /** A repeatable random source for the buffer fillers. */
  function seeded(seed = 7): () => number {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  describe('fillBrownNoise', () => {
    it('stays inside -1..1 and uses most of that range', () => {
      const data = new Float32Array(44100);
      fillBrownNoise(data, seeded());

      const peak = data.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
      expect(peak).toBeLessThanOrEqual(1);
      expect(peak).toBeGreaterThan(0.5);
    });

    it('is darker than white noise: consecutive samples move much less', () => {
      const brown = new Float32Array(44100);
      fillBrownNoise(brown, seeded());
      const random = seeded();
      const white = Float32Array.from({ length: 44100 }, () => random() * 2 - 1);

      const roughness = (d: Float32Array) => {
        let sum = 0;
        for (let i = 1; i < d.length; i++) sum += Math.abs(d[i] - d[i - 1]);
        return sum / (d.length - 1);
      };
      expect(roughness(brown)).toBeLessThan(roughness(white) / 5);
    });
  });

  describe('fillImpulseResponse', () => {
    it('decays: loud at the start, silent at the end', () => {
      const data = new Float32Array(44100);
      fillImpulseResponse(data, seeded());

      const energy = (from: number, to: number) => {
        let sum = 0;
        for (let i = from; i < to; i++) sum += data[i] * data[i];
        return sum / (to - from);
      };
      expect(energy(0, 4410)).toBeGreaterThan(energy(22050, 26460) * 10);
      expect(Math.abs(data[data.length - 1])).toBeLessThan(0.001);
    });

    it('stays inside -1..1', () => {
      const data = new Float32Array(22050);
      fillImpulseResponse(data, seeded(3));

      expect(data.every((v) => Math.abs(v) <= 1)).toBeTrue();
    });
  });
});
