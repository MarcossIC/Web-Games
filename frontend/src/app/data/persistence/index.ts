export type { KeyValueStore } from './key-value-store';
export { memoryStore } from './memory-store';
export { browserStore, webStore, type WebStorage } from './browser-store';
export { type Check, count, flag, nullable, number, type NumberRule, object, recordOf, text } from './codecs';
export { defineEntry, type Entry, type EntrySpec } from './entry';
export { bestPerKey, type Best, type BestPerKey, type Better, keepBest } from './records';
export { GAME_STORE, persisted, type Persisted } from './game-store';
