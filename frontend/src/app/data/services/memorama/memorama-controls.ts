import type { KeyBinding } from '@app-input';

export type MemoramaAction = 'pause';

/** Memorama's keys, by KeyboardEvent.key: the cards are picked with a click. */
export const MEMORAMA_KEYS: readonly KeyBinding<MemoramaAction>[] = [{ action: 'pause', keys: ['p', 'Escape'] }];
