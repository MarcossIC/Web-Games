import { InputState, TAP, inputHints, lockedTargetX } from './input-state';

describe('InputState', () => {
  let input: InputState;

  beforeEach(() => {
    input = new InputState();
  });

  it('starts idle', () => {
    const frame = input.sample();
    expect(frame.moveAxis).toBe(0);
    expect(frame.pointerX).toBeNull();
    expect(frame.launchPressed).toBeFalse();
    expect(frame.fireHeld).toBeFalse();
    expect(frame.overdrivePressed).toBeFalse();
  });

  it('returns the same object every frame (no allocation per frame)', () => {
    expect(input.sample()).toBe(input.sample());
  });

  describe('keyboard', () => {
    it('steers with left and right, both cancel out', () => {
      input.keyDown('left');
      expect(input.sample().moveAxis).toBe(-1);
      input.keyDown('right');
      expect(input.sample().moveAxis).toBe(0);
      input.keyUp('left');
      expect(input.sample().moveAxis).toBe(1);
    });

    it('fire launches once and stays held while down', () => {
      input.keyDown('fire');
      let frame = input.sample();
      expect(frame.launchPressed).toBeTrue();
      expect(frame.fireHeld).toBeTrue();
      frame = input.sample();
      expect(frame.launchPressed).toBeFalse();
      expect(frame.fireHeld).toBeTrue();
      input.keyUp('fire');
      expect(input.sample().fireHeld).toBeFalse();
    });

    it('overdrive is an edge', () => {
      input.keyDown('overdrive');
      expect(input.sample().overdrivePressed).toBeTrue();
      expect(input.sample().overdrivePressed).toBeFalse();
    });
  });

  describe('mouse', () => {
    it('steers with the pointer x', () => {
      input.pointerMove(300, false);
      expect(input.sample().pointerX).toBe(300);
    });

    it('a click launches at once and holds fire until released', () => {
      input.pointerDown(200, false, 0);
      let frame = input.sample();
      expect(frame.launchPressed).toBeTrue();
      expect(frame.fireHeld).toBeTrue();
      expect(frame.pointerX).toBe(200);
      input.pointerUp(200, false, 50);
      frame = input.sample();
      expect(frame.fireHeld).toBeFalse();
      expect(frame.launchPressed).toBeFalse();
    });
  });

  describe('switching between pointer and keyboard steering', () => {
    it('a steering key drops the pointer until the mouse moves again', () => {
      input.pointerMove(300, false);
      input.keyDown('right');
      expect(input.sample().pointerX).toBeNull();
      input.keyUp('right');
      expect(input.sample().pointerX).toBeNull();
      input.pointerMove(300, false);
      expect(input.sample().pointerX).toBeNull();
      input.pointerMove(340, false);
      expect(input.sample().pointerX).toBe(340);
      expect(input.steering).toBe('pointer');
    });

    it('fire and overdrive keys do not take the steering from the mouse', () => {
      input.pointerMove(300, false);
      input.keyDown('fire');
      input.keyDown('overdrive');
      expect(input.sample().pointerX).toBe(300);
    });
  });

  describe('touch', () => {
    it('drag steers and holds fire, but does not launch', () => {
      input.pointerDown(400, true, 0);
      input.pointerMove(520, true);
      let frame = input.sample();
      expect(frame.pointerX).toBe(520);
      expect(frame.fireHeld).toBeTrue();
      expect(frame.launchPressed).toBeFalse();
      input.pointerUp(520, true, 600);
      frame = input.sample();
      expect(frame.launchPressed).toBeFalse();
      expect(frame.fireHeld).toBeFalse();
    });

    it('a quick tap launches', () => {
      input.pointerDown(400, true, 1000);
      input.pointerUp(400 + TAP.MAX_MOVE - 1, true, 1000 + TAP.MAX_MS - 1);
      expect(input.sample().launchPressed).toBeTrue();
    });

    it('a slow press is not a tap', () => {
      input.pointerDown(400, true, 0);
      input.pointerUp(400, true, TAP.MAX_MS + 1);
      expect(input.sample().launchPressed).toBeFalse();
    });

    it('a tap shorter than a frame still fires once (lasers)', () => {
      input.pointerDown(400, true, 0);
      input.pointerUp(400, true, 40);
      const frame = input.sample();
      expect(frame.launchPressed).toBeTrue();
      expect(frame.fireHeld).toBeTrue();
      expect(input.sample().fireHeld).toBeFalse();
    });

    it('a key steers after the finger lifts, and a stale touch move does not take the paddle back', () => {
      input.pointerDown(400, true, 0);
      input.pointerMove(700, true);
      input.pointerUp(700, true, 500);
      expect(input.sample().pointerX).toBe(700);
      input.keyDown('left');
      expect(input.sample().pointerX).toBeNull();
      expect(input.sample().moveAxis).toBe(-1);
      input.pointerMove(700, true);
      input.pointerMove(650, true);
      expect(input.sample().pointerX).toBeNull();
      expect(input.steering).toBe('keyboard');
    });

    it('a second finger does not teleport the paddle, and only the first one steers', () => {
      input.pointerDown(300, true, 0, 1);
      input.pointerMove(320, true, 1);
      input.pointerDown(800, true, 100, 2);
      expect(input.sample().pointerX).toBe(320);
      input.pointerMove(820, true, 2);
      expect(input.sample().pointerX).toBe(320);
      // The second finger lifting is no tap and does not end the first finger's drag.
      input.pointerUp(800, true, 150, 2);
      let frame = input.sample();
      expect(frame.launchPressed).toBeFalse();
      expect(frame.fireHeld).toBeTrue();
      input.pointerMove(360, true, 1);
      expect(input.sample().pointerX).toBe(360);
      input.pointerUp(360, true, 900, 1);
      frame = input.sample();
      expect(frame.fireHeld).toBeFalse();
      // Once every finger is up, a new one steers again.
      input.pointerDown(500, true, 1000, 3);
      expect(input.sample().pointerX).toBe(500);
    });

    it('a second finger tapping while the first steers triggers Overdrive, once', () => {
      input.pointerDown(300, true, 0, 1);
      expect(input.sample().overdrivePressed).withContext('one finger alone').toBeFalse();
      input.pointerDown(800, true, 100, 2);
      const frame = input.sample();
      expect(frame.overdrivePressed).toBeTrue();
      expect(frame.pointerX).withContext('the first finger keeps steering').toBe(300);
      expect(frame.launchPressed).toBeFalse();
      expect(input.sample().overdrivePressed).withContext('edge, cleared once sampled').toBeFalse();
    });

    it('a single finger, or a mouse click, never triggers Overdrive', () => {
      input.pointerDown(300, true, 0, 1);
      input.pointerUp(300, true, 100, 1);
      expect(input.sample().overdrivePressed).toBeFalse();
      input.pointerDown(300, false, 200);
      expect(input.sample().overdrivePressed).toBeFalse();
    });

    it('a finger hovering without touching does not steer', () => {
      input.pointerMove(100, true);
      expect(input.sample().pointerX).toBeNull();
    });
  });

  it('releaseAll lets go of every key and the pointer, and drops pending edges', () => {
    input.keyDown('left');
    input.keyDown('fire');
    input.pointerDown(100, false, 0);
    input.releaseAll();
    const frame = input.sample();
    expect(frame.moveAxis).toBe(0);
    expect(frame.fireHeld).toBeFalse();
    expect(frame.launchPressed).toBeFalse();
  });

  it('ignores a non-finite pointer x', () => {
    input.pointerMove(Number.NaN, false);
    expect(input.sample().pointerX).toBeNull();
  });

  describe('input hints', () => {
    it('speaks of keys and clicks for a mouse, and of taps for a finger', () => {
      expect(inputHints(false)).toEqual({ launch: 'CLICK OR SPACE TO LAUNCH', cardFooter: 'CLICK OR SPACE TO CONTINUE', nova: 'SHIFT · NOVA' });
      expect(inputHints(true)).toEqual({ launch: 'TAP TO LAUNCH', cardFooter: 'TAP TO CONTINUE', nova: '2-FINGER TAP · NOVA' });
    });
  });

  describe('locked pointer (the cursor stays inside the game)', () => {
    it('walks the target by the motion from where it was', () => {
      expect(lockedTargetX(400, 30, 60, 900)).toBe(430);
      expect(lockedTargetX(400, -30, 60, 900)).toBe(370);
    });

    it("stops at the paddle's reach, so turning back answers at once", () => {
      expect(lockedTargetX(880, 500, 60, 900)).toBe(900);
      expect(lockedTargetX(80, -500, 60, 900)).toBe(60);
      expect(lockedTargetX(900, -10, 60, 900)).toBe(890);
    });

    it('ignores a motion that is not a number', () => {
      expect(lockedTargetX(400, Number.NaN, 60, 900)).toBe(400);
    });
  });
});
