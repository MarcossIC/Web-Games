import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { browserStore } from './browser-store';
import { count } from './codecs';
import { defineEntry } from './entry';
import { GAME_STORE, persisted } from './game-store';
import type { KeyValueStore } from './key-value-store';
import { memoryStore } from './memory-store';

const counter = defineEntry({
  game: 'test-game',
  name: 'counter',
  version: 1,
  fallback: { n: 0 },
  fields: { n: count() },
});

describe('GAME_STORE', () => {
  it('is the browser store in the browser', () => {
    expect(TestBed.inject(GAME_STORE)).toBe(browserStore());
  });

  it('is a store in memory on the server: nothing reaches localStorage', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const setItem = spyOn(localStorage, 'setItem');
    const store = TestBed.inject(GAME_STORE);

    store.write('gg:test-game:server', '1');

    expect(store.read('gg:test-game:server')).toBe('1');
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('persisted', () => {
  let store: KeyValueStore;

  beforeEach(() => {
    store = memoryStore();
    TestBed.configureTestingModule({ providers: [{ provide: GAME_STORE, useValue: store }] });
  });

  const make = () => TestBed.runInInjectionContext(() => persisted(counter));

  it('starts from what was saved', () => {
    counter.write(store, { n: 7 });

    expect(make().value()).toEqual({ n: 7 });
  });

  it('set shows and saves the new value', () => {
    const saved = make();

    saved.set({ n: 3 });

    expect(saved.value()).toEqual({ n: 3 });
    expect(counter.read(store)).toEqual({ n: 3 });
  });

  it('update changes it from the current value', () => {
    const saved = make();
    saved.set({ n: 2 });

    saved.update((current) => ({ n: current.n + 1 }));

    expect(saved.value().n).toBe(3);
    expect(counter.read(store).n).toBe(3);
  });

  it('reload reads again what someone else saved', () => {
    const saved = make();
    counter.write(store, { n: 9 });
    expect(saved.value().n).toBe(0);

    saved.reload();

    expect(saved.value().n).toBe(9);
  });
});
