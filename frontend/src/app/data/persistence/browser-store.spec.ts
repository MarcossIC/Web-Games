import { browserStore, webStore, type WebStorage } from './browser-store';

function fakeStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

const denied = (): never => {
  throw new DOMException('denied', 'SecurityError');
};

const full = (): never => {
  throw new DOMException('full', 'QuotaExceededError');
};

describe('webStore', () => {
  it('reads, writes and removes through the browser storage', () => {
    const storage = fakeStorage({ a: '1' });
    const store = webStore(storage);

    expect(store.read('a')).toBe('1');
    store.write('b', '2');
    expect(storage.items.get('b')).toBe('2');
    store.remove('a');
    expect(storage.items.has('a')).toBeFalse();
  });

  it('never throws when the browser denies the storage', () => {
    const store = webStore({ getItem: denied, setItem: denied, removeItem: denied });

    expect(store.read('a')).toBeNull();
    expect(() => store.write('a', '1')).not.toThrow();
    expect(() => store.remove('a')).not.toThrow();
  });

  it('keeps for this visit a value the browser refused to write', () => {
    const store = webStore({ getItem: () => null, setItem: full, removeItem: () => undefined });

    store.write('a', '1');

    expect(store.read('a')).toBe('1');
  });

  it('reads the browser again once a refused value gets written', () => {
    const storage = fakeStorage();
    let isFull = true;
    const flaky: WebStorage = {
      ...storage,
      setItem: (key, value) => (isFull ? full() : storage.setItem(key, value)),
    };
    const store = webStore(flaky);

    store.write('a', '1');
    isFull = false;
    store.write('a', '2');
    storage.items.set('a', '3'); // another tab saved later

    expect(store.read('a')).toBe('3');
  });

  it('lives in memory when there is no browser storage', () => {
    const store = webStore(null);

    store.write('a', '1');
    expect(store.read('a')).toBe('1');
    store.remove('a');
    expect(store.read('a')).toBeNull();
  });
});

describe('browserStore', () => {
  const key = 'gg:test-game:browser-store';

  afterEach(() => localStorage.removeItem(key));

  it('is one store over localStorage, the same for everyone who asks', () => {
    expect(browserStore()).toBe(browserStore());

    browserStore().write(key, 'x');

    expect(localStorage.getItem(key)).toBe('x');
  });
});
