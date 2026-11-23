import { runnerLayout, TouchControls } from './runner-layout';
import { PadState, idlePad, readPad } from './touch-pad';

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
