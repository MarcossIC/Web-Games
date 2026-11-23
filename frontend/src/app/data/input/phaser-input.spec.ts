import * as Phaser from 'phaser';
import { KEY_CODES, type KeyBinding, type KeyLike } from './key-bindings';
import { heldKeys, keyPresses } from './phaser-input';

/**
 * A real Phaser game with its keyboard and one empty scene, its loop
 * asleep. A key event sent to window goes through Phaser at once (the
 * keyboard manager asks the scene plugins to process it): `press` then
 * clears the manager's queue, as the loop does after each step, so no
 * event is processed twice.
 */
function startKeyboardGame(): Promise<{ scene: Phaser.Scene; game: Phaser.Game }> {
  return new Promise((resolve) => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const game = new Phaser.Game({
      type: Phaser.HEADLESS,
      parent,
      width: 64,
      height: 64,
      banner: false,
      audio: { noAudio: true },
      scene: class extends Phaser.Scene {
        constructor() {
          super('keyboard-test');
        }
        create() {
          game.loop.sleep();
          resolve({ scene: this, game });
        }
      },
    });
  });
}

function stop(game: Phaser.Game): Promise<void> {
  return new Promise((done) => {
    game.events.once(Phaser.Core.Events.DESTROY, () => done());
    game.destroy(true);
    game.loop.wake();
  });
}

type Action = 'left' | 'jump' | 'pause' | 'restart' | 'retry';

describe('Phaser input adapter', () => {
  let scene: Phaser.Scene;
  let game: Phaser.Game;

  beforeEach(async () => {
    ({ scene, game } = await startKeyboardGame());
  });

  afterEach(async () => {
    await stop(game);
  });

  /** Each event a later timeStamp, as a real keyboard gives. */
  let clock = 0;

  /**
   * Sends a key to window the way a browser does, keyCode included. Phaser
   * drops an event with the same key, type and timeStamp as the one before
   * (a duplicate), and two events sent in a row can share a timeStamp.
   */
  function press(
    type: 'keydown' | 'keyup',
    key: string,
    code: string,
    keyCode: number,
    init: KeyboardEventInit = {}
  ): void {
    const event = new KeyboardEvent(type, { key, code, ...init });
    Object.defineProperty(event, 'keyCode', { value: keyCode });
    Object.defineProperty(event, 'timeStamp', { value: ++clock });
    window.dispatchEvent(event);
    game.events.emit(Phaser.Core.Events.POST_STEP);
  }

  describe('heldKeys', () => {
    const HELD: KeyBinding<Action>[] = [
      { action: 'left', keyCodes: [KEY_CODES.LEFT, KEY_CODES.A] },
      { action: 'restart', keyCodes: [KEY_CODES.R] },
    ];

    it('holds an action while any of its keys is down', () => {
      const keys = heldKeys(scene.input.keyboard, HELD);
      expect(keys.isDown('left')).toBeFalse();

      press('keydown', 'a', 'KeyA', KEY_CODES.A);
      expect(keys.isDown('left')).toBeTrue();
      press('keydown', 'ArrowLeft', 'ArrowLeft', KEY_CODES.LEFT);
      press('keyup', 'a', 'KeyA', KEY_CODES.A);
      expect(keys.isDown('left')).toBeTrue();

      press('keyup', 'ArrowLeft', 'ArrowLeft', KEY_CODES.LEFT);
      expect(keys.isDown('left')).toBeFalse();
    });

    it('holds nothing for an action without keys', () => {
      expect(heldKeys(scene.input.keyboard, HELD).isDown('jump')).toBeFalse();
    });

    it('lets go of every key when the game loses the focus', () => {
      const keys = heldKeys(scene.input.keyboard, HELD);
      press('keydown', 'a', 'KeyA', KEY_CODES.A);

      game.events.emit(Phaser.Core.Events.BLUR);

      expect(keys.isDown('left')).toBeFalse();
    });

    it('hands each press its event once, not the repeats that follow', () => {
      const keys = heldKeys(scene.input.keyboard, HELD);
      const heard: KeyLike[] = [];
      keys.onPress('restart', (event) => heard.push(event));

      press('keydown', 'r', 'KeyR', KEY_CODES.R);
      press('keydown', 'r', 'KeyR', KEY_CODES.R, { repeat: true });
      press('keyup', 'r', 'KeyR', KEY_CODES.R);

      expect(heard.length).toBe(1);
      expect(heard[0].repeat).toBeFalse();
    });

    it('a key held from before comes in as a repeat: the press is not fresh', () => {
      const keys = heldKeys(scene.input.keyboard, HELD);
      const heard: KeyLike[] = [];
      keys.onPress('restart', (event) => heard.push(event));

      // The R that restarted the run is still down when the new scene starts.
      press('keydown', 'r', 'KeyR', KEY_CODES.R, { repeat: true });

      expect(heard.map((event) => event.repeat)).toEqual([true]);
    });

    it('works without a keyboard', () => {
      const keys = heldKeys(null, HELD);
      expect(keys.isDown('left')).toBeFalse();
      expect(() => keys.onPress('restart', () => {})).not.toThrow();
    });
  });

  describe('keyPresses', () => {
    it('hands the action and the event of each key press', () => {
      const heard: [Action, KeyLike][] = [];
      keyPresses<Action>(scene.input.keyboard, [{ action: 'retry', codes: ['Space'] }], (action, event) =>
        heard.push([action, event])
      );

      press('keydown', ' ', 'Space', KEY_CODES.SPACE, { shiftKey: true });
      press('keydown', ' ', 'Space', KEY_CODES.SPACE, { repeat: true });

      expect(heard.map(([action]) => action)).toEqual(['retry', 'retry']);
      expect(heard[0][1].shiftKey).toBeTrue();
      expect(heard[1][1].repeat).toBeTrue();
    });

    it('matches by keyCode like keydown-P, and drops repeats when the binding asks', () => {
      const heard: Action[] = [];
      keyPresses<Action>(
        scene.input.keyboard,
        [{ action: 'pause', keyCodes: [KEY_CODES.P, KEY_CODES.ESC], ignoreRepeat: true }],
        (action) => heard.push(action)
      );

      // A layout whose P sits where Q is on QWERTY: keyCode follows the letter.
      press('keydown', 'p', 'KeyQ', KEY_CODES.P);
      press('keydown', 'p', 'KeyQ', KEY_CODES.P, { repeat: true });
      press('keydown', 'Escape', 'Escape', KEY_CODES.ESC);

      expect(heard).toEqual(['pause', 'pause']);
    });

    it('stays quiet for keys with no binding', () => {
      const heard: Action[] = [];
      keyPresses<Action>(scene.input.keyboard, [{ action: 'pause', codes: ['KeyP'] }], (action) => heard.push(action));

      press('keydown', 'x', 'KeyX', 88);

      expect(heard).toEqual([]);
    });

    it('hears key releases when asked to', () => {
      const ups: Action[] = [];
      keyPresses<Action>(
        scene.input.keyboard,
        [{ action: 'left', codes: ['KeyA'] }],
        () => {},
        (action) => ups.push(action)
      );

      press('keydown', 'a', 'KeyA', KEY_CODES.A);
      press('keyup', 'a', 'KeyA', KEY_CODES.A);

      expect(ups).toEqual(['left']);
    });

    it('stops when the returned function is called', () => {
      const heard: Action[] = [];
      const off = keyPresses<Action>(scene.input.keyboard, [{ action: 'pause', codes: ['KeyP'] }], (action) =>
        heard.push(action)
      );

      off();
      press('keydown', 'p', 'KeyP', KEY_CODES.P);

      expect(heard).toEqual([]);
    });
  });
});
