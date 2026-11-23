import { bindKeys } from '@app-input';
import { KEY_THROTTLE_MS, SNAKELING_KEYS, type SnakelingAction } from './snakeling-controls';

describe('Snakeling controls', () => {
  const resolve = bindKeys(SNAKELING_KEYS);

  // The table the game had before the input layer (assets/constants/snakeling.ts).
  const OLD_TABLE: Record<string, SnakelingAction> = {
    ArrowLeft: 'left',
    a: 'left',
    ArrowRight: 'right',
    d: 'right',
    ArrowDown: 'down',
    s: 'down',
    p: 'pause',
    Escape: 'pause',
    ArrowUp: 'up',
    w: 'up',
  };

  for (const [key, action] of Object.entries(OLD_TABLE)) {
    it(`"${key}" still asks for ${action}`, () => {
      expect(resolve({ key })).toBe(action);
    });
  }

  it('reads keys case sensitively, as before', () => {
    expect(resolve({ key: 'W' })).toBeUndefined();
  });

  it('ignores other keys', () => {
    expect(resolve({ key: 'x' })).toBeUndefined();
  });

  it('takes at most one key press every 90 ms', () => {
    expect(KEY_THROTTLE_MS).toBe(90);
  });
});
