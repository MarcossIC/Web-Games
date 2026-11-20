import type { KeyValueStore } from './key-value-store';

/** The part of the Web Storage API a store needs. */
export type WebStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * A browser storage behind the KeyValueStore contract. The browser may deny
 * it (private mode, blocked site data) or run out of room: then nothing
 * throws, and a value it refused stays in memory for this visit, so the game
 * still shows what it just saved.
 */
export function webStore(storage: WebStorage | null): KeyValueStore {
  const refused = new Map<string, string>();
  return {
    read(key) {
      if (refused.has(key)) return refused.get(key)!;
      try {
        return storage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    write(key, value) {
      try {
        if (!storage) throw new Error('no storage');
        storage.setItem(key, value);
        refused.delete(key);
      } catch {
        refused.set(key, value);
      }
    },
    remove(key) {
      refused.delete(key);
      try {
        storage?.removeItem(key);
      } catch {
        // Denied: there was nothing it could have kept either.
      }
    },
  };
}

let shared: KeyValueStore | undefined;

/**
 * The one store over localStorage, for Angular (through GAME_STORE) and for
 * the Phaser scenes, which live outside the injector. Sharing it keeps a
 * refused value visible to everyone during the visit.
 */
export function browserStore(): KeyValueStore {
  shared ??= webStore(localStorageOrNull());
  return shared;
}

function localStorageOrNull(): WebStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Even reading the property throws when the site data is blocked.
    return null;
  }
}
