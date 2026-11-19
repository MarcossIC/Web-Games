import { hasMouse, startsAsTouch } from './input-device';

describe('startsAsTouch', () => {
  const media = (coarse: boolean) => ({
    matchMedia: (query: string) => ({ matches: coarse && query === '(pointer: coarse)' }),
  });

  it('is touch on a coarse pointer, before the first tap reaches the canvas', () => {
    // The dialog's Play button is a DOM tap: the scene never saw it.
    expect(startsAsTouch(media(true))).toBeTrue();
    expect(startsAsTouch(media(false))).toBeFalse();
  });

  it('is a mouse where there is no window or no matchMedia (SSR, old browsers)', () => {
    expect(startsAsTouch(undefined)).toBeFalse();
    expect(startsAsTouch({})).toBeFalse();
  });
});

describe('hasMouse', () => {
  const media = (fine: boolean) => ({
    matchMedia: (query: string) => ({ matches: fine && query === '(any-pointer: fine)' }),
  });

  it('is true where a mouse or trackpad is attached, false on a phone', () => {
    expect(hasMouse(media(true))).toBeTrue();
    expect(hasMouse(media(false))).toBeFalse();
  });

  it('is false where there is no window or no matchMedia (SSR, old browsers)', () => {
    expect(hasMouse(undefined)).toBeFalse();
    expect(hasMouse({})).toBeFalse();
  });
});
