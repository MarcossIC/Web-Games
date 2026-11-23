import { bindKeys } from '@app-input';
import { TICTACTOE_KEYS } from './tictactoe-controls';

describe('Tic-Tac-Toe controls', () => {
  const resolve = bindKeys(TICTACTOE_KEYS);

  // Before the input layer these keys restarted the game (tictactoe.component.ts).
  for (const key of ['p', 'Escape']) {
    it(`"${key}" restarts the game`, () => {
      expect(resolve({ key })).toBe('reset');
    });
  }

  it('reads keys case sensitively and ignores the rest, as before', () => {
    expect(resolve({ key: 'P' })).toBeUndefined();
    expect(resolve({ key: 'x' })).toBeUndefined();
  });
});
