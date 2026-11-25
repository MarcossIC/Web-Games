import { bindKeys } from '@app-input';
import { RINGOUT_KEYS } from './ringout-controls';

describe('Ring Out controls', () => {
  const resolve = bindKeys(RINGOUT_KEYS);

  for (const key of ['p', 'P', 'Escape']) {
    it(`"${key}" pauses`, () => {
      expect(resolve({ key })).toBe('pause');
    });
  }

  it('"r" starts the level again and "h" asks for a hint', () => {
    expect(resolve({ key: 'r' })).toBe('retry');
    expect(resolve({ key: 'R' })).toBe('retry');
    expect(resolve({ key: 'h' })).toBe('hint');
  });

  it('does not start again on a held key', () => {
    expect(resolve({ key: 'r', repeat: true })).toBeUndefined();
  });

  it('leaves Ctrl+R and Ctrl+P to the browser', () => {
    expect(resolve({ key: 'r', ctrlKey: true })).toBeUndefined();
    expect(resolve({ key: 'p', metaKey: true })).toBeUndefined();
  });

  it('ignores other keys', () => {
    expect(resolve({ key: 'x' })).toBeUndefined();
  });
});
