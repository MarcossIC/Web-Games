import { HoldToConfirm, isFreshPress } from './hold-to-confirm';

const FRAME_MS = 1000 / 60;

/** Feeds `ms` of frames with the key down or up; true if any frame fired. */
function hold(confirm: HoldToConfirm, isDown: boolean, ms: number): boolean {
  let fired = false;
  for (let t = 0; t < ms; t += FRAME_MS) fired = confirm.update(isDown, FRAME_MS) || fired;
  return fired;
}

function ready(durationMs = 700): HoldToConfirm {
  return new HoldToConfirm(durationMs);
}

describe('HoldToConfirm', () => {
  it('acts once the key has been held for the whole time', () => {
    const confirm = ready();

    expect(hold(confirm, true, 650)).toBeFalse();
    expect(hold(confirm, true, 100)).toBeTrue();
  });

  it('does nothing for a key let go before the time, and starts over', () => {
    const confirm = ready();
    hold(confirm, true, 600);

    hold(confirm, false, 50);
    expect(confirm.progress).toBe(0);

    expect(hold(confirm, true, 600)).toBeFalse();
  });

  it('acts only once per hold: the key has to be let go to act again', () => {
    const confirm = ready();
    expect(hold(confirm, true, 800)).toBeTrue();

    expect(hold(confirm, true, 2000)).toBeFalse();

    hold(confirm, false, 50);
    expect(hold(confirm, true, 800)).toBeTrue();
  });

  it('says how far along the hold is, from 0 to 1', () => {
    const confirm = ready();
    expect(confirm.progress).toBe(0);

    confirm.update(true, 350);
    expect(confirm.progress).toBeCloseTo(0.5, 5);

    confirm.update(true, 1000);
    expect(confirm.progress).toBe(1);
  });
});

describe('isFreshPress', () => {
  it('counts a hold that began with a real press', () => {
    expect(isFreshPress({ repeat: false })).toBeTrue();
  });

  it('does not count a key held from before, which comes back as repeats', () => {
    expect(isFreshPress({ repeat: true })).toBeFalse();
    expect(isFreshPress(undefined)).toBeFalse();
  });
});
