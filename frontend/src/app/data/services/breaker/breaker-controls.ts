import type { KeyBinding } from '@app-input';
import type { InputAction } from './view/input-state';

/**
 * The keys the scene reads, by KeyboardEvent.code: the same places on any
 * layout. Repeats come through: InputController counts every press as a
 * gesture (the audio unlock) and only then drops the repeat.
 */
export const BREAKER_GAME_KEYS: readonly KeyBinding<InputAction>[] = [
  { action: 'left', codes: ['KeyA', 'ArrowLeft'] },
  { action: 'right', codes: ['KeyD', 'ArrowRight'] },
  { action: 'fire', codes: ['Space'] },
  { action: 'overdrive', codes: ['ShiftLeft', 'ShiftRight', 'KeyE'] },
];

/**
 * What the page does with a key, outside the scene. Esc pauses like P, but
 * on its own: the Esc that broke the mouse lock also arrives as a key, and
 * only that one is dropped (BreakerControllerService.handleAction).
 */
export type BreakerPageAction = 'pause' | 'escape' | 'mute' | 'mouse-lock';

/** Shared by the page's keys: once per press, any case, never a Ctrl, Cmd or Alt combo (the browser's). */
const PAGE_KEY = { ignoreCase: true, ignoreRepeat: true, ignoreModifiers: true } as const;

/** The page's keys, by KeyboardEvent.key: P, Esc, M (mute) and L (mouse lock). */
export const BREAKER_PAGE_KEYS: readonly KeyBinding<BreakerPageAction>[] = [
  { action: 'pause', keys: ['p'], ...PAGE_KEY },
  { action: 'escape', keys: ['escape'], ...PAGE_KEY },
  { action: 'mute', keys: ['m'], ...PAGE_KEY },
  { action: 'mouse-lock', keys: ['l'], ...PAGE_KEY },
];
