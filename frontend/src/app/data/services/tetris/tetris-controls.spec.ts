import { bindKeys } from '@app-input';
import { ACTION } from '@app/data/models/tetris/MoveDirections.enum';
import { phoneLayout, TETRIS_DRAGS, TETRIS_KEYS } from './tetris-controls';

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

describe('Tetris drags', () => {
  it('moves the piece the way the finger drags it, and brings it down', () => {
    expect(TETRIS_DRAGS.left).toBe(ACTION.LEFT);
    expect(TETRIS_DRAGS.right).toBe(ACTION.RIGHT);
    expect(TETRIS_DRAGS.down).toBe(ACTION.DOWN);
  });

  it('does nothing on a drag up: rotating is a tap', () => {
    expect(TETRIS_DRAGS.up).toBeNull();
  });
});

describe('phoneLayout', () => {
  it('lays the page out for a phone up to 500 px wide', () => {
    expect(phoneLayout(320)).toBeTrue();
    expect(phoneLayout(500)).toBeTrue();
  });

  it('not on wider screens', () => {
    expect(phoneLayout(501)).toBeFalse();
  });
});
