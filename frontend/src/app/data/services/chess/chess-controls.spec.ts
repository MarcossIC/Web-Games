import { bindKeys } from '@app-input';
import { CHESS_KEYS, type ChessAction } from './chess-controls';

describe('Chess controls', () => {
  const resolve = bindKeys(CHESS_KEYS);

  // The keys of the switch the page had before the input layer (chess.component.ts).
  const OLD_TABLE: Record<string, ChessAction> = {
    ArrowRight: 'next',
    ArrowLeft: 'previous',
    u: 'undo',
    p: 'pause',
    Escape: 'pause',
  };

  for (const [key, action] of Object.entries(OLD_TABLE)) {
    it(`"${key}" still asks for ${action}`, () => {
      expect(resolve({ key })).toBe(action);
    });
  }

  it('reads keys case sensitively and ignores the rest, as before', () => {
    expect(resolve({ key: 'U' })).toBeUndefined();
    expect(resolve({ key: 'ArrowUp' })).toBeUndefined();
  });
});
