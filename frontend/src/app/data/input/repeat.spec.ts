import { isFreshPress } from './repeat';

describe('isFreshPress', () => {
  it('counts a hold that began with a real press', () => {
    expect(isFreshPress({ repeat: false })).toBeTrue();
  });

  it('does not count a key held from before, which comes back as repeats', () => {
    expect(isFreshPress({ repeat: true })).toBeFalse();
    expect(isFreshPress(undefined)).toBeFalse();
  });
});
