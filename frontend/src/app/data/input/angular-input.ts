import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, filter, fromEvent, map, type Observable, throttleTime } from 'rxjs';
import { type BindOptions, bindKeys, type KeyBinding } from './key-bindings';
import { type Direction, SWIPE_MIN_PX, SwipeTracker } from './swipe';

/** An action asked for from the page, and when (KeyboardEvent.timeStamp). */
export interface ActionEvent<A> {
  readonly action: A;
  readonly timeStamp: number;
}

export interface KeyActionOptions<A> extends BindOptions<A> {
  /** keydown acts as the key goes down (and on its repeats); keyup once it is let go. */
  readonly on: 'keydown' | 'keyup';
  /**
   * At most one key press per this many milliseconds. It is counted on every
   * key, bound or not, before the key is read: as the games always did.
   */
  readonly throttleMs?: number;
}

/**
 * The page's keys as a game's actions. Call it in an injection context (a
 * field or the constructor of a component): it listens on the document in
 * the browser, hears nothing on the server, and stops when its owner is
 * destroyed.
 */
export function keyActions<A>(bindings: readonly KeyBinding<A>[], options: KeyActionOptions<A>): Observable<ActionEvent<A>> {
  const document = inject(DOCUMENT);
  const platform = inject(PLATFORM_ID);
  const destroy = inject(DestroyRef);
  if (!isPlatformBrowser(platform)) return EMPTY;

  const { on, throttleMs, ...bindOptions } = options;
  const resolve = bindKeys(bindings, bindOptions);
  let keys = fromEvent<KeyboardEvent>(document, on);
  if (throttleMs) keys = keys.pipe(throttleTime(throttleMs));
  return keys.pipe(
    map((event) => ({ action: resolve(event), timeStamp: event.timeStamp })),
    filter((event): event is ActionEvent<A> => event.action !== undefined),
    takeUntilDestroyed(destroy)
  );
}

/**
 * Swipes of a finger on an element (see SwipeTracker): `onDirection` hears
 * each way the finger goes. Plain DOM, so it can be set up outside Angular
 * (a game loop's zone). Returns the function that stops listening.
 */
export function listenSwipes(
  element: HTMLElement,
  onDirection: (direction: Direction) => void,
  min = SWIPE_MIN_PX
): () => void {
  const swipes = new SwipeTracker(min);
  const read = (event: PointerEvent) => ({
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    type: event.pointerType,
  });
  const down = (event: PointerEvent) => swipes.down(read(event));
  const move = (event: PointerEvent) => {
    const direction = swipes.move(read(event));
    if (direction) onDirection(direction);
  };
  const up = (event: PointerEvent) => swipes.up(read(event));

  element.addEventListener('pointerdown', down);
  element.addEventListener('pointermove', move);
  element.addEventListener('pointerup', up);
  element.addEventListener('pointercancel', up);
  return () => {
    element.removeEventListener('pointerdown', down);
    element.removeEventListener('pointermove', move);
    element.removeEventListener('pointerup', up);
    element.removeEventListener('pointercancel', up);
  };
}
