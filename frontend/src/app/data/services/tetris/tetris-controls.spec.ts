import { bindKeys } from '@app-input';
import { ACTION } from '@app/data/models/tetris/MoveDirections.enum';
import { screenButtonsOn, TETRIS_KEYS } from './tetris-controls';

describe('Tetris controls', () => {
  const resolve = bindKeys(TETRIS_KEYS, { otherwise: null });

  // The table the game had before the input layer (assets/constants/tetrisConstanst.ts).
  const OLD_TABLE: Record<string, ACTION> = {
    ArrowLeft: ACTION.LEFT,
    a: ACTION.LEFT,
    ArrowRight: ACTION.RIGHT,
    d: ACTION.RIGHT,
    ArrowDown: ACTION.DOWN,
    s: ACTION.DOWN,
    p: ACTION.PAUSE,
    Escape: ACTION.PAUSE,
    ArrowUp: ACTION.ROTATE,
    w: ACTION.ROTATE,
  };

  for (const [key, action] of Object.entries(OLD_TABLE)) {
    it(`"${key}" still asks for ${ACTION[action]}`, () => {
      expect(resolve({ key })).toBe(action);
    });
  }

  it('reads keys case sensitively, as before: "A" is not "a"', () => {
    expect(resolve({ key: 'A' })).toBeNull();
    expect(resolve({ key: 'P' })).toBeNull();
  });

  it('turns any other key into the empty action, which still settles a resting piece', () => {
    expect(resolve({ key: 'Shift' })).toBeNull();
    expect(resolve({ key: 'x' })).toBeNull();
  });

  it('a held key keeps acting through its repeats, as before', () => {
    expect(resolve({ key: 'ArrowLeft', repeat: true })).toBe(ACTION.LEFT);
  });
});

describe('screenButtonsOn', () => {
  it('works the buttons on the screen up to 500 px wide', () => {
    expect(screenButtonsOn(320)).toBeTrue();
    expect(screenButtonsOn(500)).toBeTrue();
  });

  it('leaves them off on wider screens', () => {
    expect(screenButtonsOn(501)).toBeFalse();
  });
});
