import {
  COMBO_BASE_WINDOW_MS,
  COMBO_MAX_WINDOW_MS,
  applePoints,
  comboMultiplier,
  comboWindowMs,
} from './scoring';

describe('Snakeling scoring', () => {
  it('multiplies by 1 for the first apple, 1.2 for the second, then 0.1 more each', () => {
    expect(comboMultiplier(1)).toBe(1);
    expect(comboMultiplier(2)).toBe(1.2);
    expect(comboMultiplier(3)).toBe(1.3);
    expect(comboMultiplier(10)).toBe(2);
  });

  it('stops the multiplier at x10', () => {
    expect(comboMultiplier(90)).toBe(10);
    expect(comboMultiplier(500)).toBe(10);
  });

  it('rounds the points of a multiplied apple', () => {
    expect(applePoints(1)).toBe(8);
    expect(applePoints(2)).toBe(10); // 9.6
    expect(applePoints(3)).toBe(10); // 10.4
    expect(applePoints(90)).toBe(80);
  });

  it('gives a second more for the next apple with each apple of the combo, up to a limit', () => {
    expect(comboWindowMs(1)).toBe(COMBO_BASE_WINDOW_MS);
    expect(comboWindowMs(2)).toBe(COMBO_BASE_WINDOW_MS + 1000);
    expect(comboWindowMs(50)).toBe(COMBO_MAX_WINDOW_MS);
  });
});
