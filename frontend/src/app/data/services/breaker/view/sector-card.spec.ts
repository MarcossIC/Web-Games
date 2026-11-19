import { CARD, cardCanContinue, sectorCardText } from './sector-card';

describe('sectorCardText', () => {
  const cleared = { sector: 3, timeMs: 31200, parTimeMs: 45000, bonus: 4200, noMiss: true };

  it('names the sector and shows time, par and bonus', () => {
    const card = sectorCardText(cleared, 29100);
    expect(card.title).toBe('SECTOR 03 CLEARED');
    expect(card.time).toBe('0:31.20');
    expect(card.par).toBe('PAR 0:45');
    expect(card.bonus).toBe('+4,200');
    expect(card.noMiss).toBe('NO MISS');
  });

  it('shows the previous best and no NEW mark when it was not beaten', () => {
    const card = sectorCardText(cleared, 29100);
    expect(card.best).toBe('BEST 0:29.10');
    expect(card.isNewBest).toBeFalse();
  });

  it('marks NEW when the time beats the previous best', () => {
    const card = sectorCardText(cleared, 40000);
    expect(card.isNewBest).toBeTrue();
    expect(card.best).toBe('BEST 0:31.20');
  });

  it('marks NEW on the first clear of a sector', () => {
    const card = sectorCardText(cleared, undefined);
    expect(card.isNewBest).toBeTrue();
    expect(card.best).toBe('BEST 0:31.20');
  });

  it('says nothing about misses when a life was lost', () => {
    expect(sectorCardText({ ...cleared, noMiss: false }, undefined).noMiss).toBe('');
  });

  it('shows the core bonus on a boss sector', () => {
    expect(sectorCardText({ ...cleared, bonus: 9200, bossBonus: 5000 }, undefined).core).toBe('CORE +5,000');
  });

  it('shows no core row on a plain sector', () => {
    expect(sectorCardText(cleared, undefined).core).toBe('');
    expect(sectorCardText({ ...cleared, bossBonus: 0 }, undefined).core).toBe('');
  });
});

describe('cardCanContinue', () => {
  it('ignores a press right after the card shows, so a laser click does not skip it', () => {
    expect(cardCanContinue(CARD.MIN_SKIP_MS - 1, true)).toBeFalse();
    expect(cardCanContinue(CARD.MIN_SKIP_MS, true)).toBeTrue();
  });

  it('continues on its own after the auto delay', () => {
    expect(cardCanContinue(CARD.AUTO_CONTINUE_MS - 1, false)).toBeFalse();
    expect(cardCanContinue(CARD.AUTO_CONTINUE_MS, false)).toBeTrue();
  });
});
