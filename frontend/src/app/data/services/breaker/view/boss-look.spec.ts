import {
  bossCrackLevel,
  bossHpShare,
  DamageGhost,
  DEFEAT,
  eyeCharge,
  hpFillCropPx,
  WARNING,
  warningLook,
} from './boss-look';

describe('boss looks', () => {
  it('cracks the hull at two thirds and one third of its hp', () => {
    expect(bossCrackLevel(24, 24)).toBe(0);
    expect(bossCrackLevel(17, 24)).toBe(0);
    expect(bossCrackLevel(16, 24)).toBe(1);
    expect(bossCrackLevel(9, 24)).toBe(1);
    expect(bossCrackLevel(8, 24)).toBe(2);
    expect(bossCrackLevel(0, 24)).toBe(2);
  });

  it('turns hp into a share and a crop width in whole texture pixels', () => {
    expect(bossHpShare(12, 24)).toBe(0.5);
    expect(bossHpShare(30, 24)).toBe(1);
    expect(bossHpShare(-1, 24)).toBe(0);
    expect(bossHpShare(5, 0)).toBe(0);
    expect(hpFillCropPx(1, 294, 2)).toBe(588);
    expect(hpFillCropPx(0.5, 294, 2)).toBe(294);
    expect(hpFillCropPx(0.0001, 294, 2)).toBe(1);
    expect(hpFillCropPx(0, 294, 2)).toBe(0);
  });

  it('charges the eye over the last 700 ms before a volley', () => {
    expect(eyeCharge(2000)).toBe(0);
    expect(eyeCharge(700)).toBe(0);
    expect(eyeCharge(350)).toBeCloseTo(0.5, 10);
    expect(eyeCharge(0)).toBe(1);
    expect(eyeCharge(-10)).toBe(1);
  });

  it('lets the damage ghost trail down behind the hp, never under it', () => {
    const ghost = new DamageGhost();
    expect(ghost.update(0.5, 100)).toBe(1); // it waits a moment before it drains
    for (let i = 0; i < 100; i++) ghost.update(0.5, 50);
    expect(ghost.value).toBe(0.5);
    expect(ghost.update(0.8, 16)).toBe(0.8);
  });

  it('pops the warning in, blinks it, and fades it out', () => {
    expect(warningLook(-1).visible).toBeFalse();
    const start = warningLook(0);
    expect(start.visible).toBeTrue();
    expect(start.scaleY).toBeCloseTo(0, 6);
    expect(warningLook(WARNING.IN_MS).scaleY).toBeCloseTo(1, 6);
    const blinks = new Set<number>();
    for (let t = WARNING.IN_MS; t < WARNING.IN_MS + WARNING.HOLD_MS; t += 40) blinks.add(warningLook(t).alpha);
    expect(blinks.size).toBeGreaterThan(1);
    expect(warningLook(WARNING.TOTAL_MS - 1).alpha).toBeLessThan(0.05);
    expect(warningLook(WARNING.TOTAL_MS).visible).toBeFalse();
  });

  it('plays the defeat as bursts that end in one big blast', () => {
    expect(DEFEAT.BURSTS_MS.length).toBeGreaterThan(4);
    for (let i = 1; i < DEFEAT.BURSTS_MS.length; i++) expect(DEFEAT.BURSTS_MS[i]).toBeGreaterThan(DEFEAT.BURSTS_MS[i - 1]);
    expect(DEFEAT.FINALE_MS).toBeGreaterThan(DEFEAT.BURSTS_MS[DEFEAT.BURSTS_MS.length - 1]);
    expect(DEFEAT.FINALE_MS + DEFEAT.FADE_MS).toBeLessThan(2600);
  });
});
