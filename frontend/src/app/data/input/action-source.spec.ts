import { type ActionSource, anyDown } from './action-source';

type Action = 'left' | 'right';

const holding = (...held: Action[]): ActionSource<Action> => ({ isDown: (action) => held.includes(action) });

describe('anyDown', () => {
  it('holds an action that any source holds', () => {
    const controls = anyDown(holding('left'), holding('right'));
    expect(controls.isDown('left')).toBeTrue();
    expect(controls.isDown('right')).toBeTrue();
  });

  it('releases an action no source holds', () => {
    expect(anyDown(holding(), holding('right')).isDown('left')).toBeFalse();
  });

  it('reads the sources every time, not once', () => {
    let held: Action[] = [];
    const controls = anyDown<Action>({ isDown: (action) => held.includes(action) });
    expect(controls.isDown('left')).toBeFalse();
    held = ['left'];
    expect(controls.isDown('left')).toBeTrue();
  });
});
