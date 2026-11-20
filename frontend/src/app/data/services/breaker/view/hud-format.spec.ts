import {
  comboLabel,
  effectRatio,
  formatMultiplier,
  formatScore,
  paceLabel,
  pointsLabel,
  sectorLabel,
} from './hud-format';

describe('hud-format', () => {
  describe('formatScore', () => {
    it('groups thousands with commas', () => {
      expect(formatScore(0)).toBe('0');
      expect(formatScore(950)).toBe('950');
      expect(formatScore(1000)).toBe('1,000');
      expect(formatScore(12345)).toBe('12,345');
      expect(formatScore(1234567)).toBe('1,234,567');
    });

    it('drops fractions and never shows garbage', () => {
      expect(formatScore(1999.9)).toBe('1,999');
      expect(formatScore(-5)).toBe('0');
      expect(formatScore(Number.NaN)).toBe('0');
      expect(formatScore(Number.POSITIVE_INFINITY)).toBe('0');
    });
  });

  describe('formatMultiplier', () => {
    it('shows one decimal with an x in front', () => {
      expect(formatMultiplier(1)).toBe('x1.0');
      expect(formatMultiplier(2.34)).toBe('x2.3');
      expect(formatMultiplier(2.36)).toBe('x2.4');
      expect(formatMultiplier(10)).toBe('x10.0');
    });

    it('treats garbage as x1.0', () => {
      expect(formatMultiplier(Number.NaN)).toBe('x1.0');
      expect(formatMultiplier(0)).toBe('x1.0');
    });
  });

  describe('sectorLabel', () => {
    it('pads the sector to two digits', () => {
      expect(sectorLabel(3)).toBe('SECTOR 03');
      expect(sectorLabel(12)).toBe('SECTOR 12');
      expect(sectorLabel(104)).toBe('SECTOR 104');
    });
  });

  describe('effectRatio', () => {
    it('is the share of the effect left, 0..1', () => {
      expect(effectRatio(5000, 10000)).toBe(0.5);
      expect(effectRatio(10000, 10000)).toBe(1);
      expect(effectRatio(0, 10000)).toBe(0);
    });

    it('clamps and survives a zero duration', () => {
      expect(effectRatio(12000, 10000)).toBe(1);
      expect(effectRatio(-3, 10000)).toBe(0);
      expect(effectRatio(100, 0)).toBe(0);
      expect(effectRatio(Number.NaN, 1000)).toBe(0);
    });
  });

  describe('paceLabel', () => {
    it('shows the sector time against the par', () => {
      expect(paceLabel(24100, 45000)).toBe('0:24.10 / PAR 0:45');
      expect(paceLabel(62345, 90000)).toBe('1:02.34 / PAR 1:30');
    });
  });

  describe('pointsLabel', () => {
    it('shows the points and the multiplier when it is above 1', () => {
      expect(pointsLabel(150, 2.3)).toBe('+150 x2.3');
      expect(pointsLabel(1500, 1)).toBe('+1,500');
    });
  });

  describe('comboLabel', () => {
    it('names the combo', () => {
      expect(comboLabel(7)).toBe('7 COMBO');
    });
  });
});
