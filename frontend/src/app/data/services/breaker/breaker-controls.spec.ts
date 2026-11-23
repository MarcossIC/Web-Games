import { bindKeys } from '@app-input';
import type { InputAction } from './view/input-state';
import { BREAKER_GAME_KEYS, BREAKER_PAGE_KEYS } from './breaker-controls';

describe('Nova Breaker controls', () => {
  describe('in the game, by KeyboardEvent.code', () => {
    const resolve = bindKeys(BREAKER_GAME_KEYS);

    // KEY_ACTIONS of view/InputController.ts before the input layer.
    const OLD_TABLE: Record<string, InputAction> = {
      KeyA: 'left',
      ArrowLeft: 'left',
      KeyD: 'right',
      ArrowRight: 'right',
      Space: 'fire',
      ShiftLeft: 'overdrive',
      ShiftRight: 'overdrive',
      KeyE: 'overdrive',
    };

    for (const [code, action] of Object.entries(OLD_TABLE)) {
      it(`${code} still asks for ${action}`, () => {
        expect(resolve({ code })).toBe(action);
      });
    }

    it('lets repeats and modifiers through: InputController drops repeats after the gesture', () => {
      expect(resolve({ code: 'Space', repeat: true })).toBe('fire');
      expect(resolve({ code: 'KeyA', ctrlKey: true })).toBe('left');
    });

    it('ignores other keys', () => {
      expect(resolve({ code: 'KeyP' })).toBeUndefined();
      expect(resolve({ code: 'KeyM' })).toBeUndefined();
    });
  });

  describe('on the page, by KeyboardEvent.key', () => {
    const resolve = bindKeys(BREAKER_PAGE_KEYS);

    it('P pauses, Esc pauses too (as its own action, for the lock echo), M mutes, L locks the mouse', () => {
      expect(resolve({ key: 'p' })).toBe('pause');
      expect(resolve({ key: 'Escape' })).toBe('escape');
      expect(resolve({ key: 'm' })).toBe('mute');
      expect(resolve({ key: 'l' })).toBe('mouse-lock');
    });

    it('whatever the case', () => {
      expect(resolve({ key: 'P' })).toBe('pause');
      expect(resolve({ key: 'M' })).toBe('mute');
      expect(resolve({ key: 'L' })).toBe('mouse-lock');
    });

    it('once per press', () => {
      expect(resolve({ key: 'p', repeat: true })).toBeUndefined();
      expect(resolve({ key: 'm', repeat: true })).toBeUndefined();
    });

    it("leaves Ctrl, Cmd and Alt combos to the browser (Ctrl+P prints), but not Shift", () => {
      expect(resolve({ key: 'p', ctrlKey: true })).toBeUndefined();
      expect(resolve({ key: 'm', metaKey: true })).toBeUndefined();
      expect(resolve({ key: 'Escape', altKey: true })).toBeUndefined();
      expect(resolve({ key: 'P', shiftKey: true })).toBe('pause');
    });

    it('ignores other keys', () => {
      expect(resolve({ key: 'x' })).toBeUndefined();
    });
  });
});
