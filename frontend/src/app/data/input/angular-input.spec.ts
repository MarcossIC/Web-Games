import { DOCUMENT } from '@angular/common';
import {
  createEnvironmentInjector,
  EnvironmentInjector,
  PLATFORM_ID,
  runInInjectionContext,
} from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { type ActionEvent, keyActions, listenSwipes } from './angular-input';
import type { KeyBinding } from './key-bindings';

type Action = 'left' | 'pause';

const BINDINGS: KeyBinding<Action>[] = [
  { action: 'left', keys: ['ArrowLeft', 'a'] },
  { action: 'pause', keys: ['p', 'Escape'] },
];

const press = (key: string, type: 'keydown' | 'keyup' = 'keydown') =>
  TestBed.inject(DOCUMENT).dispatchEvent(new KeyboardEvent(type, { key }));

describe('keyActions', () => {
  let injector: EnvironmentInjector;

  beforeEach(() => {
    injector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
  });

  afterEach(() => {
    if (!injector.destroyed) injector.destroy();
  });

  const listen = <A>(bindings: KeyBinding<A>[], options: Parameters<typeof keyActions<A>>[1]) => {
    const heard: ActionEvent<A>[] = [];
    runInInjectionContext(injector, () => keyActions(bindings, options)).subscribe((event) => heard.push(event));
    return heard;
  };

  it('turns the keys of the page into the actions they are bound to', () => {
    const heard = listen(BINDINGS, { on: 'keydown' });
    press('a');
    press('Escape');
    expect(heard.map((event) => event.action)).toEqual(['left', 'pause']);
  });

  it('carries the timeStamp of the key press', () => {
    const heard = listen(BINDINGS, { on: 'keydown' });
    const event = new KeyboardEvent('keydown', { key: 'p' });
    TestBed.inject(DOCUMENT).dispatchEvent(event);
    expect(heard[0].timeStamp).toBe(event.timeStamp);
  });

  it('stays quiet for a key with no binding', () => {
    const heard = listen(BINDINGS, { on: 'keydown' });
    press('x');
    expect(heard).toEqual([]);
  });

  it('gives the fallback for a key with no binding when there is one', () => {
    const heard = listen<Action | null>(BINDINGS, { on: 'keydown', otherwise: null });
    press('Shift');
    expect(heard.map((event) => event.action)).toEqual([null]);
  });

  it('hears only the event it was asked for', () => {
    const heard = listen(BINDINGS, { on: 'keyup' });
    press('p', 'keydown');
    expect(heard).toEqual([]);
    press('p', 'keyup');
    expect(heard.map((event) => event.action)).toEqual(['pause']);
  });

  it('lets one key press through per window, any key, bound or not', fakeAsync(() => {
    const heard = listen(BINDINGS, { on: 'keydown', throttleMs: 90 });
    press('a');
    press('p');
    expect(heard.map((event) => event.action)).toEqual(['left']);

    tick(90);
    // A key with no action opens a window of its own, as before.
    press('x');
    press('a');
    expect(heard.map((event) => event.action)).toEqual(['left']);

    tick(90);
    press('p');
    expect(heard.map((event) => event.action)).toEqual(['left', 'pause']);
    tick(90);
  }));

  it('stops listening when its owner is destroyed', () => {
    const heard = listen(BINDINGS, { on: 'keydown' });
    injector.destroy();
    press('a');
    expect(heard).toEqual([]);
  });

});

describe('keyActions on the server', () => {
  it('listens to nothing', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const injector = TestBed.inject(EnvironmentInjector);
    const addEventListener = spyOn(TestBed.inject(DOCUMENT), 'addEventListener').and.callThrough();
    let completed = false;
    runInInjectionContext(injector, () => keyActions(BINDINGS, { on: 'keydown' })).subscribe({
      complete: () => (completed = true),
    });

    expect(completed).toBeTrue();
    expect(addEventListener).not.toHaveBeenCalled();
  });
});

describe('listenSwipes', () => {
  let area: HTMLElement;

  beforeEach(() => {
    area = document.createElement('div');
    document.body.appendChild(area);
  });

  afterEach(() => area.remove());

  const pointer = (type: string, x: number, y: number, pointerType = 'touch', pointerId = 1) =>
    area.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerType, pointerId }));

  it('reports each way a finger swipes on the element', () => {
    const ways: string[] = [];
    listenSwipes(area, (way) => ways.push(way));

    pointer('pointerdown', 100, 100);
    pointer('pointermove', 130, 100);
    pointer('pointermove', 130, 140);

    expect(ways).toEqual(['right', 'down']);
  });

  it('leaves the mouse alone', () => {
    const ways: string[] = [];
    listenSwipes(area, (way) => ways.push(way));

    pointer('pointerdown', 100, 100, 'mouse');
    pointer('pointermove', 200, 100, 'mouse');

    expect(ways).toEqual([]);
  });

  it('forgets a finger that was lifted or cancelled', () => {
    const ways: string[] = [];
    listenSwipes(area, (way) => ways.push(way));

    pointer('pointerdown', 100, 100);
    pointer('pointerup', 100, 100);
    pointer('pointermove', 200, 100);
    pointer('pointerdown', 100, 100);
    pointer('pointercancel', 100, 100);
    pointer('pointermove', 200, 100);

    expect(ways).toEqual([]);
  });

  it('stops listening when the returned function is called', () => {
    const ways: string[] = [];
    const stop = listenSwipes(area, (way) => ways.push(way));

    stop();
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 200, 100);

    expect(ways).toEqual([]);
  });
});
