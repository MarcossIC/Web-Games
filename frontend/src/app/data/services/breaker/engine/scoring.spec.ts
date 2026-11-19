import { brickPoints, ComboMeter, comboMultiplier, extraLivesBetween, SCORE, sectorBonus } from './scoring';

describe('breaker scoring', () => {
  describe('comboMultiplier', () => {
    it('adds 0.1 per brick of combo, from x1', () => {
      expect(comboMultiplier(0, false)).toBe(1);
      expect(comboMultiplier(1, false)).toBeCloseTo(1.1, 10);
      expect(comboMultiplier(15, false)).toBeCloseTo(2.5, 10);
    });

    it('stops at x5', () => {
      expect(comboMultiplier(40, false)).toBe(5);
      expect(comboMultiplier(400, false)).toBe(5);
    });

    it('doubles during nova, the cap included', () => {
      expect(comboMultiplier(0, true)).toBe(2);
      expect(comboMultiplier(400, true)).toBe(10);
    });
  });

  describe('ComboMeter', () => {
    it('adds one per brick and restarts the 3 s window each time', () => {
      const meter = new ComboMeter();
      expect(meter.hit()).toBe(1);
      expect(meter.tick(2900)).toBe(0);
      expect(meter.hit()).toBe(2);
      expect(meter.remainingMs).toBe(SCORE.COMBO_WINDOW_MS);
      expect(meter.tick(2999)).toBe(0);
      expect(meter.combo).toBe(2);
    });

    it('is lost after 3 s without a brick, saying how long it was', () => {
      const meter = new ComboMeter();
      meter.hit();
      meter.hit();
      meter.hit();

      expect(meter.tick(3000)).toBe(3);
      expect(meter.combo).toBe(0);
      expect(meter.remainingMs).toBe(0);
      expect(meter.tick(5000)).toBe(0);
    });

    it('can be broken at once (a life lost) and remembers the best', () => {
      const meter = new ComboMeter();
      for (let i = 0; i < 7; i++) meter.hit();
      expect(meter.break()).toBe(7);
      expect(meter.break()).toBe(0);
      meter.hit();
      expect(meter.best).toBe(7);
    });
  });

  describe('brickPoints', () => {
    it('is the brick value times the multiplier, rounded', () => {
      expect(brickPoints(50, 1, false)).toBe(55);
      expect(brickPoints(120, 0, false)).toBe(120);
      expect(brickPoints(150, 100, true)).toBe(1500);
    });
  });

  describe('sectorBonus', () => {
    it('pays 1000 per sector plus 50 per whole second under par plus 2000 for no miss', () => {
      expect(sectorBonus(3, 50500, 60000, true)).toEqual({ sector: 3000, time: 450, noMiss: 2000, total: 5450 });
    });

    it('pays no time bonus over par and nothing for a miss', () => {
      expect(sectorBonus(2, 90000, 60000, false)).toEqual({ sector: 2000, time: 0, noMiss: 0, total: 2000 });
    });
  });

  describe('extra lives', () => {
    it('counts the 40000-point marks crossed by a score change', () => {
      expect(SCORE.EXTRA_LIFE_EVERY).toBe(40000);
      expect(extraLivesBetween(0, 39999)).toBe(0);
      expect(extraLivesBetween(39999, 40000)).toBe(1);
      expect(extraLivesBetween(40000, 40500)).toBe(0);
      expect(extraLivesBetween(30000, 121000)).toBe(3);
    });
  });
});
