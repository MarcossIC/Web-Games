import { runnerLayout, TouchControls } from './runner-layout';
import { PadState, TapTracker, idlePad, readPad } from './touch-pad';

const controls = runnerLayout(390, 763, true).controls as TouchControls;

/** A finger resting in the middle of a key. */
function fingerOn(key: 'left' | 'right' | 'crouch' | 'jump', isDown = true) {
  const { x, y, w, h } = controls[key].zone;
  return { isDown, x: x + w / 2, y: y + h / 2 };
}

describe('readPad', () => {
  let pad: PadState;

  beforeEach(() => {
    pad = idlePad();
  });

  it('presses nothing with no finger on the screen', () => {
    expect(readPad(controls, [], pad)).toEqual({ left: false, right: false, jump: false, crouch: false });
  });

  it('presses the key under the finger', () => {
    expect(readPad(controls, [fingerOn('left')], pad).left).toBeTrue();
    expect(readPad(controls, [fingerOn('jump')], pad).jump).toBeTrue();
  });

  it('runs and jumps at once with two fingers', () => {
    const state = readPad(controls, [fingerOn('right'), fingerOn('jump')], pad);

    expect(state).toEqual({ left: false, right: true, jump: true, crouch: false });
  });

  it('ignores a finger that was lifted', () => {
    expect(readPad(controls, [fingerOn('right', false)], pad).right).toBeFalse();
  });

  it('lets go of a key as soon as its finger slides to the next one', () => {
    readPad(controls, [fingerOn('left')], pad);

    const state = readPad(controls, [fingerOn('right')], pad);

    expect(state.left).toBeFalse();
    expect(state.right).toBeTrue();
  });

  it('ignores a finger on the picture, away from every key', () => {
    expect(readPad(controls, [{ isDown: true, x: 180, y: 200 }], pad)).toEqual(idlePad());
  });

  it('presses nothing on a screen without touch keys', () => {
    expect(readPad(null, [fingerOn('jump')], pad)).toEqual(idlePad());
  });

  it('fills the state it was given, so reading it every frame makes no garbage', () => {
    expect(readPad(controls, [fingerOn('jump')], pad)).toBe(pad);
  });
});

describe('TapTracker', () => {
  const buttons = [
    { key: 'resume', x: 0, y: 0, w: 100, h: 40 },
    { key: 'exit', x: 0, y: 50, w: 100, h: 40 },
  ] as const;
  type Key = (typeof buttons)[number]['key'];

  const hit = (x: number, y: number): Key | null =>
    buttons.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)?.key ?? null;

  let taps: TapTracker<Key>;

  beforeEach(() => {
    taps = new TapTracker<Key>(hit);
  });

  it('is a tap when the finger goes down and comes up on the same button', () => {
    taps.down(1, 50, 20);

    expect(taps.up(1, 60, 25)).toBe('resume');
  });

  it('is not a tap when the finger slides off before coming up', () => {
    taps.down(1, 50, 20);

    expect(taps.up(1, 50, 200)).toBeNull();
  });

  it('is not a tap when the finger comes up on another button', () => {
    taps.down(1, 50, 20);

    expect(taps.up(1, 50, 70)).toBeNull();
  });

  it('is not a tap when the finger went down somewhere else', () => {
    taps.down(1, 50, 200);

    expect(taps.up(1, 50, 20)).toBeNull();
  });

  it('shows a button as pressed only while a finger that started on it is down', () => {
    expect(taps.isPressed('exit')).toBeFalse();

    taps.down(1, 50, 70);
    expect(taps.isPressed('exit')).toBeTrue();
    expect(taps.isPressed('resume')).toBeFalse();

    taps.up(1, 50, 70);
    expect(taps.isPressed('exit')).toBeFalse();
  });

  it('follows each finger on its own', () => {
    taps.down(1, 50, 20);
    taps.down(2, 50, 70);

    expect(taps.up(2, 50, 70)).toBe('exit');
    expect(taps.up(1, 50, 20)).toBe('resume');
  });

  it('forgets every finger when asked, so a redrawn screen starts clean', () => {
    taps.down(1, 50, 20);

    taps.clear();

    expect(taps.isPressed('resume')).toBeFalse();
    expect(taps.up(1, 50, 20)).toBeNull();
  });
});
