import { bindKeys } from '@app-input';
import { MEMORAMA_KEYS } from './memorama-controls';

describe('Memorama controls', () => {
  const resolve = bindKeys(MEMORAMA_KEYS);

  // Before the input layer the page paused on these keys (memorama.component.ts).
  for (const key of ['p', 'Escape']) {
    it(`"${key}" pauses`, () => {
      expect(resolve({ key })).toBe('pause');
    });
  }

  it('reads keys case sensitively and ignores the rest, as before', () => {
    expect(resolve({ key: 'P' })).toBeUndefined();
    expect(resolve({ key: 'x' })).toBeUndefined();
  });
});
