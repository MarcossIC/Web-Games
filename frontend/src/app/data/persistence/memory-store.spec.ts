import { memoryStore } from './memory-store';

describe('memoryStore', () => {
  it('reads back what was written, and null for what was not', () => {
    const store = memoryStore();

    store.write('gg:test-game:a', '1');

    expect(store.read('gg:test-game:a')).toBe('1');
    expect(store.read('gg:test-game:b')).toBeNull();
  });

  it('starts with the values it is given', () => {
    expect(memoryStore({ 'gg:test-game:a': 'v' }).read('gg:test-game:a')).toBe('v');
  });

  it('forgets a removed value', () => {
    const store = memoryStore({ 'gg:test-game:a': 'v' });

    store.remove('gg:test-game:a');

    expect(store.read('gg:test-game:a')).toBeNull();
  });
});
