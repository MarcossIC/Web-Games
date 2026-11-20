import { isPlatformBrowser } from '@angular/common';
import { inject, InjectionToken, PLATFORM_ID, signal, type Signal } from '@angular/core';
import { browserStore } from './browser-store';
import type { Entry } from './entry';
import type { KeyValueStore } from './key-value-store';
import { memoryStore } from './memory-store';

/** The store of the app: localStorage in the browser, memory on the server. */
export const GAME_STORE = new InjectionToken<KeyValueStore>('GameStore', {
  providedIn: 'root',
  factory: () => (isPlatformBrowser(inject(PLATFORM_ID)) ? browserStore() : memoryStore()),
});

/** An entry as a signal: what the page shows and what is saved never drift apart. */
export interface Persisted<T> {
  readonly value: Signal<T>;
  /** Shows and saves `value`. */
  set(value: T): void;
  update(change: (current: T) => T): void;
  /** Reads the store again: what another visit saved since. */
  reload(): void;
}

/** Call it in an injection context (a field of a service), or pass the store. */
export function persisted<T extends object>(entry: Entry<T>, store: KeyValueStore = inject(GAME_STORE)): Persisted<T> {
  const state = signal(entry.read(store));
  const set = (value: T): void => {
    state.set(value);
    entry.write(store, value);
  };
  return {
    value: state.asReadonly(),
    set,
    update: (change) => set(change(state())),
    reload: () => state.set(entry.read(store)),
  };
}
