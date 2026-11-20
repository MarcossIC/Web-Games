import type { KeyValueStore } from './key-value-store';

/** A store that lives as long as the page: the server's, and the tests'. */
export function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const items = new Map(Object.entries(initial));
  return {
    read: (key) => items.get(key) ?? null,
    write: (key, value) => void items.set(key, value),
    remove: (key) => void items.delete(key),
  };
}
