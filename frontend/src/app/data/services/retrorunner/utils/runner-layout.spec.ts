import {
  DESKTOP_LAYOUT,
  DESKTOP_WIDTH,
  NARROW_WIDTH,
  Rect,
  RunnerLayout,
  TouchControls,
  WORLD_HEIGHT,
  contains,
  hudLayout,
  runnerLayout,
  sameLayout,
  wasTurned,
} from './runner-layout';

/** A phone held upright, as the browser leaves it once its bars are drawn. */
const PHONE_UPRIGHT = { width: 390, height: 763 };
/** The same phone on its side. */
const PHONE_SIDEWAYS = { width: 844, height: 390 };

const upright = () => runnerLayout(PHONE_UPRIGHT.width, PHONE_UPRIGHT.height, true);
const sideways = () => runnerLayout(PHONE_SIDEWAYS.width, PHONE_SIDEWAYS.height, true);

const PAD_KEYS = ['left', 'right', 'crouch', 'jump'] as const;

/** How far ahead of the resting player a desktop shows the ground. */
const DESKTOP_AHEAD = DESKTOP_WIDTH - (DESKTOP_WIDTH * 0.5 + 80 / 2);

function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function isInside(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

function controlsOf(layout: RunnerLayout): TouchControls {
  if (!layout.controls) throw new Error('This layout has no touch controls');
  return layout.controls;
}

/** The band of the view the player rests in, from the left of the view. */
function restBand(layout: RunnerLayout): { from: number; until: number } {
  const middle = layout.width * layout.cameraAnchor;
  return { from: middle - layout.cameraDeadzone / 2, until: middle + layout.cameraDeadzone / 2 };
}

describe('runnerLayout', () => {
  describe('with a mouse and a keyboard', () => {
    it('keeps the 550 by 330 picture, with nothing to touch', () => {
      const layout = runnerLayout(1100, 660, false);

      expect(layout.mode).toBe('desktop');
      expect(layout.width).toBe(DESKTOP_WIDTH);
      expect(layout.height).toBe(WORLD_HEIGHT);
      expect(layout.viewHeight).toBe(WORLD_HEIGHT);
      expect(layout.deck).toBeNull();
      expect(layout.controls).toBeNull();
    });

    it('keeps the player in the middle of the view, as always', () => {
      const layout = runnerLayout(1100, 660, false);

      expect(layout.cameraAnchor).toBe(0.5);
      expect(layout.cameraDeadzone).toBe(80);
    });

    it('does not follow the shape of the window', () => {
      expect(runnerLayout(390, 844, false)).toEqual(DESKTOP_LAYOUT);
    });
  });

  describe('on a phone held upright', () => {
    it('gives the canvas the shape of the screen, so it fills it', () => {
      const layout = upright();

      expect(layout.mode).toBe('deck');
      expect(layout.width).toBe(NARROW_WIDTH);
      expect(layout.height).toBe(704);
      expect(layout.height / layout.width).toBeCloseTo(PHONE_UPRIGHT.height / PHONE_UPRIGHT.width, 2);
    });

    it('puts a deck for the thumbs under the view, so no finger covers the run', () => {
      const layout = upright();

      expect(layout.deck).toEqual({ x: 0, y: 493, w: 360, h: 211 });
      expect(layout.viewHeight).toBe(493);
    });

    it('always shows the whole world above the deck', () => {
      for (const height of [540, 600, 667, 740, 800, 860, 932]) {
        const layout = runnerLayout(390, height, true);

        expect(layout.viewHeight).withContext(`390x${height}`).toBeGreaterThanOrEqual(WORLD_HEIGHT);
        expect(layout.viewHeight + (layout.deck?.h ?? 0))
          .withContext(`390x${height}`)
          .toBe(layout.height);
      }
    });

    it('stops growing on a very long screen: the rest is left empty', () => {
      expect(runnerLayout(360, 1000, true).height).toBe(860);
    });

    it('rests the player on the left, to see as far ahead as on a desktop', () => {
      const layout = upright();

      const ahead = layout.width - restBand(layout).until;

      expect(ahead).toBeGreaterThan(DESKTOP_AHEAD - 10);
    });

    it('splits the whole deck between the four keys: any touch on it does something', () => {
      const layout = upright();
      const controls = controlsOf(layout);
      const deck = layout.deck!;

      const covered = PAD_KEYS.reduce((sum, key) => sum + controls[key].zone.w, 0);

      expect(covered).toBe(deck.w);
      for (const key of PAD_KEYS) {
        expect(controls[key].zone.y).withContext(key).toBe(deck.y);
        expect(controls[key].zone.h).withContext(key).toBe(deck.h);
      }
    });

    it('moves with the left thumb and jumps with the right one', () => {
      const { left, right, crouch, jump } = controlsOf(upright());

      expect(left.zone.x).toBeLessThan(right.zone.x);
      expect(right.zone.x).toBeLessThan(crouch.zone.x);
      expect(crouch.zone.x).toBeLessThan(jump.zone.x);
      // The key pressed the most is the biggest.
      expect(jump.face.w).toBeGreaterThan(left.face.w);
    });

    it('leaves the last rows of the deck free under the keys, for its label', () => {
      const layout = upright();
      const deck = layout.deck!;
      const { jump } = controlsOf(layout);

      expect(deck.y + deck.h - (jump.face.y + jump.face.h)).toBeGreaterThanOrEqual(24);
    });
  });

  describe('on a phone on its side', () => {
    it('keeps the height of the world and shows more of it across', () => {
      const layout = sideways();

      expect(layout.mode).toBe('overlay');
      expect(layout.height).toBe(WORLD_HEIGHT);
      expect(layout.width).toBe(714);
      expect(layout.viewHeight).toBe(WORLD_HEIGHT);
      expect(layout.deck).toBeNull();
    });

    it('puts the keys over the bottom corners of the picture', () => {
      const layout = sideways();
      const { left, right, crouch, jump } = controlsOf(layout);
      const middle = layout.width / 2;

      for (const key of [left, right]) {
        expect(key.zone.x + key.zone.w).toBeLessThan(middle);
        expect(key.zone.y + key.zone.h).toBe(layout.height);
      }
      for (const key of [crouch, jump]) {
        expect(key.zone.x).toBeGreaterThan(middle);
        expect(key.zone.y + key.zone.h).toBe(layout.height);
      }
    });

    it('never rests the player under the arrows', () => {
      const screens = [
        [844, 390],
        [640, 360],
        [568, 320],
        [915, 412],
        [960, 600],
      ];
      for (const [width, height] of screens) {
        const layout = runnerLayout(width, height, true);
        const arrows = controlsOf(layout).right.face;

        expect(layout.mode).withContext(`${width}x${height}`).toBe('overlay');
        expect(restBand(layout).from).withContext(`${width}x${height}`).toBeGreaterThan(arrows.x + arrows.w);
      }
    });

    it('keeps as much ground in sight ahead of the player as a desktop, clear of the keys', () => {
      const layout = sideways();

      const hiddenFrom = controlsOf(layout).crouch.zone.x;

      expect(hiddenFrom - restBand(layout).until).toBeGreaterThanOrEqual(DESKTOP_AHEAD);
    });

    it('does not push the player further left than it needs to', () => {
      // A very wide view has ground to spare: the player stays near the middle.
      expect(runnerLayout(1040, 390, true).cameraAnchor).toBeCloseTo(0.42, 2);
    });

    it('does not get wider than 800: a longer screen keeps bars at its sides', () => {
      expect(runnerLayout(1040, 390, true).width).toBe(800);
      expect(runnerLayout(1040, 390, true).height).toBe(WORLD_HEIGHT);
    });
  });

  describe('on a tablet', () => {
    it('shows more of the world instead of drawing it giant: a game pixel is 1.6 CSS pixels at most', () => {
      const uprightTablet = runnerLayout(768, 1024, true);
      const sidewaysTablet = runnerLayout(1024, 768, true);

      expect([uprightTablet.width, uprightTablet.height]).toEqual([480, 640]);
      expect([sidewaysTablet.width, sidewaysTablet.height]).toEqual([640, 480]);
    });

    it('has room for the deck both ways: no key is drawn over the run', () => {
      for (const layout of [runnerLayout(768, 1024, true), runnerLayout(1024, 768, true)]) {
        expect(layout.mode).toBe('deck');
        expect(layout.deck).not.toBeNull();
        expect(layout.viewHeight).toBeGreaterThanOrEqual(WORLD_HEIGHT);
      }
    });

    it('adds sky over the world when it is too short for a deck', () => {
      const small = runnerLayout(960, 600, true);

      expect(small.mode).toBe('overlay');
      expect([small.width, small.height]).toEqual([600, 375]);
      expect(small.viewHeight).toBe(375);
    });
  });

  describe('on a small screen close to a square', () => {
    it('keeps a view wide enough to play, with the keys over the picture', () => {
      const square = runnerLayout(400, 400, true);

      expect(square.mode).toBe('overlay');
      expect([square.width, square.height]).toEqual([480, 480]);
    });

    it('has no room for a deck when upright but short', () => {
      const layout = runnerLayout(400, 480, true);

      expect(layout.mode).toBe('overlay');
      expect(layout.deck).toBeNull();
      expect(layout.controls).not.toBeNull();
    });
  });

  it('starts as the desktop picture with keys while the screen is not measured yet', () => {
    const layout = runnerLayout(0, 0, true);

    expect(layout.width).toBe(DESKTOP_WIDTH);
    expect(layout.height).toBe(WORLD_HEIGHT);
    expect(layout.controls).not.toBeNull();
  });

  describe('touch keys, in every shape', () => {
    const shapes: [string, RunnerLayout][] = [
      ['upright', upright()],
      ['sideways', sideways()],
      ['small upright', runnerLayout(360, 560, true)],
      ['shortest deck', runnerLayout(390, 510, true)],
      ['tablet', runnerLayout(1024, 768, true)],
      ['tablet upright', runnerLayout(768, 1024, true)],
      ['small tablet', runnerLayout(960, 600, true)],
      ['short upright', runnerLayout(400, 480, true)],
    ];

    for (const [name, layout] of shapes) {
      it(`${name}: draws each key inside the area that presses it, inside the canvas`, () => {
        const controls = controlsOf(layout);
        const canvas = { x: 0, y: 0, w: layout.width, h: layout.height };

        for (const key of [...PAD_KEYS, 'pause'] as const) {
          expect(isInside(controls[key].face, controls[key].zone)).withContext(key).toBeTrue();
          expect(isInside(controls[key].zone, canvas)).withContext(key).toBeTrue();
        }
      });

      it(`${name}: no two keys share a point`, () => {
        const controls = controlsOf(layout);
        const keys = [...PAD_KEYS, 'pause'] as const;

        for (let i = 0; i < keys.length; i++) {
          for (let j = i + 1; j < keys.length; j++) {
            expect(overlap(controls[keys[i]].zone, controls[keys[j]].zone))
              .withContext(`${keys[i]} and ${keys[j]}`)
              .toBeFalse();
          }
        }
      });

      it(`${name}: has pause in the top right corner, big enough for a finger`, () => {
        const { pause } = controlsOf(layout);

        expect(pause.zone.x + pause.zone.w).toBe(layout.width);
        expect(pause.zone.y).toBe(0);
        expect(pause.zone.w).toBeGreaterThanOrEqual(44);
        expect(pause.zone.h).toBeGreaterThanOrEqual(44);
      });

      it(`${name}: draws on whole pixels`, () => {
        const controls = controlsOf(layout);

        for (const key of [...PAD_KEYS, 'pause'] as const) {
          const { x, y, w, h } = controls[key].face;
          expect([x, y, w, h].every(Number.isInteger)).withContext(key).toBeTrue();
        }
      });
    }
  });
});

describe('hudLayout', () => {
  it('keeps the desktop line: score, clock in the middle, best at the right edge', () => {
    const hud = hudLayout(DESKTOP_LAYOUT);

    expect(hud.score).toEqual({ x: 10, y: 8, originX: 0 });
    expect(hud.clock).toEqual({ x: 275, y: 8, originX: 0.5 });
    expect(hud.best).toEqual({ x: 540, y: 8, originX: 1 });
  });

  it('ends the line before the pause key on a wide touch screen', () => {
    const layout = sideways();
    const hud = hudLayout(layout);

    expect(hud.clock.x).toBe(layout.width / 2);
    expect(hud.best.originX).toBe(1);
    expect(hud.best.x).toBeLessThan(controlsOf(layout).pause.zone.x);
  });

  it('stacks score and best on a narrow screen, with the clock beside pause', () => {
    const layout = upright();
    const hud = hudLayout(layout);

    expect(hud.best.x).toBe(hud.score.x);
    expect(hud.best.y).toBeGreaterThan(hud.score.y);
    expect(hud.clock.originX).toBe(1);
    expect(hud.clock.x).toBeLessThan(controlsOf(layout).pause.zone.x);
  });
});

describe('sameLayout', () => {
  it('tells a turned phone from the same phone', () => {
    expect(sameLayout(upright(), upright())).toBeTrue();
    expect(sameLayout(upright(), sideways())).toBeFalse();
  });

  it('tells the desktop picture from the same picture with touch keys', () => {
    expect(sameLayout(DESKTOP_LAYOUT, runnerLayout(0, 0, true))).toBeFalse();
  });
});

describe('wasTurned', () => {
  it('knows a phone that went from upright to its side, and back', () => {
    expect(wasTurned(upright(), sideways())).toBeTrue();
    expect(wasTurned(sideways(), upright())).toBeTrue();
  });

  it('knows a turned tablet, though it has a deck both ways', () => {
    expect(wasTurned(runnerLayout(768, 1024, true), runnerLayout(1024, 768, true))).toBeTrue();
  });

  it('is not fooled by a screen that only grew: the browser hid its bars', () => {
    expect(wasTurned(runnerLayout(390, 763, true), runnerLayout(390, 844, true))).toBeFalse();
  });
});

describe('contains', () => {
  const rect = { x: 10, y: 20, w: 30, h: 40 };

  it('takes its left and top edges, and leaves the right and bottom ones to the next', () => {
    expect(contains(rect, 10, 20)).toBeTrue();
    expect(contains(rect, 39, 59)).toBeTrue();
    expect(contains(rect, 40, 30)).toBeFalse();
    expect(contains(rect, 20, 60)).toBeFalse();
  });
});
