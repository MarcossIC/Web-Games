import { runnerLayout, TouchControls } from './runner-layout';
import { idlePad, idleStick, PadState, readPad, STICK_CROUCH, STICK_DEAD, STICK_JUMP, STICK_RADIUS } from './touch-pad';

const controls = runnerLayout(390, 763, true).controls as TouchControls;

/** Where the left thumb lands: the middle of the stick's hint. */
const LAND_X = controls.stick.face.x + controls.stick.face.w / 2;
const LAND_Y = controls.stick.face.y + controls.stick.face.h / 2;

/** The left thumb, landed on the stick's half and slid by dx, dy. */
function thumb(dx: number, dy: number, isDown = true) {
  return { isDown, downX: LAND_X, downY: LAND_Y, x: LAND_X + dx, y: LAND_Y + dy };
}

/** A finger resting on the right half. */
function tap(isDown = true) {
  const x = controls.jump.face.x + controls.jump.face.w / 2;
  const y = controls.jump.face.y + controls.jump.face.h / 2;
  return { isDown, downX: x, downY: y, x, y };
}

describe('readPad', () => {
  let pad: PadState;

  beforeEach(() => {
    pad = idlePad();
  });

  it('asks for nothing with no finger on the screen', () => {
    expect(readPad(controls, [], pad)).toEqual(idlePad());
  });

  it('asks for nothing from a thumb that landed and stays still', () => {
    expect(readPad(controls, [thumb(0, 0)], pad)).toEqual(idlePad());
  });

  it('ignores the shake of a resting thumb', () => {
    expect(readPad(controls, [thumb(STICK_DEAD - 1, 3)], pad)).toEqual(idlePad());
  });

  it('runs to the side the thumb slides to', () => {
    expect(readPad(controls, [thumb(-20, 0)], pad).left).toBeTrue();
    expect(readPad(controls, [thumb(20, 0)], pad)).toEqual({ left: false, right: true, jump: false, crouch: false });
  });

  it('jumps when the thumb slides up, and runs and jumps on a diagonal', () => {
    expect(readPad(controls, [thumb(0, -STICK_JUMP)], pad).jump).toBeTrue();
    expect(readPad(controls, [thumb(25, -30)], pad)).toEqual({ left: false, right: true, jump: true, crouch: false });
  });

  it('crouches when the thumb slides down', () => {
    expect(readPad(controls, [thumb(0, STICK_CROUCH)], pad).crouch).toBeTrue();
  });

  it('does not crouch while running with a thumb that drifts down a little', () => {
    expect(readPad(controls, [thumb(30, STICK_CROUCH)], pad).crouch).toBeFalse();
  });

  it('jumps while a finger stays on the right half', () => {
    expect(readPad(controls, [tap()], pad)).toEqual({ left: false, right: false, jump: true, crouch: false });
    expect(readPad(controls, [tap(false)], pad).jump).toBeFalse();
  });

  it('runs with the left thumb and jumps with the right one at once', () => {
    expect(readPad(controls, [thumb(20, 0), tap()], pad)).toEqual({
      left: false,
      right: true,
      jump: true,
      crouch: false,
    });
  });

  it('keeps a thumb that drifted across the middle as the stick', () => {
    const drifted = thumb(controls.jump.zone.x - LAND_X + 20, 0);

    expect(readPad(controls, [drifted], pad)).toEqual({ left: false, right: true, jump: false, crouch: false });
  });

  it('jumps with a second finger on the left half: only the first one is the stick', () => {
    const second = { isDown: true, downX: 30, downY: 120, x: 30, y: 120 };

    expect(readPad(controls, [thumb(-20, 0), second], pad)).toEqual({
      left: true,
      right: false,
      jump: true,
      crouch: false,
    });
  });

  it('leaves a finger that landed on pause to pause', () => {
    const { x, y, w, h } = controls.pause.zone;
    const onPause = { isDown: true, downX: x + w / 2, downY: y + h / 2, x: x + w / 2, y: y + h / 2 };

    expect(readPad(controls, [onPause], pad)).toEqual(idlePad());
  });

  it('lets go of everything once the finger is lifted', () => {
    readPad(controls, [thumb(20, -30)], pad);

    expect(readPad(controls, [thumb(20, -30, false)], pad)).toEqual(idlePad());
  });

  it('tells where to draw the stick, its knob held within its radius', () => {
    const stick = idleStick();

    readPad(controls, [thumb(200, 0)], pad, stick);

    expect(stick.active).toBeTrue();
    expect([stick.baseX, stick.baseY]).toEqual([LAND_X, LAND_Y]);
    expect(stick.push.knobX).toBe(LAND_X + STICK_RADIUS);

    readPad(controls, [], pad, stick);
    expect(stick.active).toBeFalse();
  });

  it('asks for nothing on a screen played with the keyboard', () => {
    expect(readPad(null, [tap()], pad)).toEqual(idlePad());
  });

  it('fills the state it was given, so reading it every frame makes no garbage', () => {
    expect(readPad(controls, [tap()], pad)).toBe(pad);
  });
});
