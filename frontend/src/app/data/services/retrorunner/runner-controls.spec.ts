import { bindKeys, KEY_CODES } from '@app-input';
import {
  GAME_OVER_KEYS,
  PAUSE_SCREEN_KEYS,
  RUN_HELD_KEYS,
  RUN_PAUSE_KEYS,
  type RunnerHeldAction,
} from './runner-controls';

/** The keyCodes a held action is read from. */
function codesOf(action: RunnerHeldAction): readonly number[] {
  return RUN_HELD_KEYS.filter((binding) => binding.action === action).flatMap((binding) => binding.keyCodes ?? []);
}

describe('Retro Runner controls', () => {
  describe('held keys of the run', () => {
    // What GameScene read before the input layer (addKeys and update()).
    const OLD_TABLE: Record<RunnerHeldAction, number[]> = {
      left: [KEY_CODES.LEFT, KEY_CODES.A],
      right: [KEY_CODES.RIGHT, KEY_CODES.D],
      jump: [KEY_CODES.UP, KEY_CODES.W, KEY_CODES.SPACE],
      crouch: [KEY_CODES.DOWN, KEY_CODES.S],
      restart: [KEY_CODES.R],
    };

    for (const [action, codes] of Object.entries(OLD_TABLE) as [RunnerHeldAction, number[]][]) {
      it(`${action} is held with the same keys`, () => {
        expect([...codesOf(action)].sort()).toEqual([...codes].sort());
      });
    }

    it('names keyCodes for every binding: Phaser Keys are made from them', () => {
      for (const binding of RUN_HELD_KEYS) expect(binding.keyCodes?.length).withContext(binding.action).toBeGreaterThan(0);
    });
  });

  describe('pause during the run', () => {
    const resolve = bindKeys(RUN_PAUSE_KEYS);

    it('is P or Esc by the letter of the layout (keyCode), as the run always read them', () => {
      expect(resolve({ keyCode: KEY_CODES.P, code: 'KeyR' })).toBe('pause');
      expect(resolve({ keyCode: KEY_CODES.ESC, code: 'Escape' })).toBe('pause');
      expect(resolve({ keyCode: 81, code: 'KeyP' })).toBeUndefined();
    });

    it('takes a new press only: a held P does not pause and resume over and over', () => {
      expect(resolve({ keyCode: KEY_CODES.P, repeat: true })).toBeUndefined();
    });
  });

  describe('pause screen', () => {
    const resolve = bindKeys(PAUSE_SCREEN_KEYS);

    it('resumes with P or Esc by their place on the keyboard, as before', () => {
      expect(resolve({ code: 'KeyP', keyCode: 81 })).toBe('resume');
      expect(resolve({ code: 'Escape' })).toBe('resume');
      expect(resolve({ code: 'KeyQ', keyCode: KEY_CODES.P })).toBeUndefined();
    });

    it('takes a new press only: a key held since before the pause does not resume', () => {
      expect(resolve({ code: 'KeyP', repeat: true })).toBeUndefined();
    });
  });

  describe('game over', () => {
    const resolve = bindKeys(GAME_OVER_KEYS);

    it('Space retries, with Shift too (the same seed) and on its repeats: retryChoice decides', () => {
      expect(resolve({ keyCode: KEY_CODES.SPACE })).toBe('retry');
      expect(resolve({ keyCode: KEY_CODES.SPACE, shiftKey: true })).toBe('retry');
      expect(resolve({ keyCode: KEY_CODES.SPACE, repeat: true })).toBe('retry');
    });

    it('ignores other keys', () => {
      expect(resolve({ keyCode: KEY_CODES.R })).toBeUndefined();
    });
  });
});
