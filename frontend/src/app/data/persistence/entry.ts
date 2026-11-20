import { type Check, isPlainObject } from './codecs';
import type { KeyValueStore } from './key-value-store';

export interface EntrySpec<T extends object> {
  /** The game (or `app`) that owns it: lowercase letters, digits and dashes. */
  game: string;
  /** What it holds, as `records` or `settings`: same characters. */
  name: string;
  /** Bump it when the shape changes: a value saved with another version reads as the fallback. */
  version: number;
  /** What each field reads as when nothing valid was saved for it. */
  fallback: T;
  /** How each field is checked when read back. */
  fields: { [K in keyof T]-?: Check<T[K]> };
}

/** One thing a game saves, under one key. */
export interface Entry<T extends object> {
  /** gg:<game>:<name>. */
  readonly key: string;
  /** What was saved, checked field by field; the fallback where it is missing or broken. */
  read(store: KeyValueStore): T;
  write(store: KeyValueStore, value: T): void;
}

/** How a value is kept on disk. */
interface Envelope {
  v: number;
  data: unknown;
}

const PART = /^[a-z0-9-]+$/;

export function defineEntry<T extends object>(spec: EntrySpec<T>): Entry<T> {
  if (!PART.test(spec.game) || !PART.test(spec.name)) {
    throw new Error(
      `An entry's game and name use lowercase letters, digits and dashes: got "${spec.game}" and "${spec.name}".`
    );
  }
  const key = `gg:${spec.game}:${spec.name}`;
  const fields = Object.keys(spec.fields) as (keyof T)[];

  const unwrap = (raw: string | null): Record<string, unknown> | undefined => {
    if (raw === null) return undefined;
    try {
      const envelope: unknown = JSON.parse(raw);
      if (!isPlainObject(envelope) || envelope['v'] !== spec.version) return undefined;
      const data = envelope['data'];
      return isPlainObject(data) ? data : undefined;
    } catch {
      return undefined;
    }
  };

  return {
    key,
    read(store) {
      const data = unwrap(store.read(key));
      const value = {} as T;
      for (const field of fields) {
        const checked = data === undefined ? undefined : spec.fields[field](data[field as string]);
        // A copy: whoever changes what it read must not change the fallback.
        value[field] = checked !== undefined ? checked : structuredClone(spec.fallback[field]);
      }
      return value;
    },
    write(store, value) {
      const envelope: Envelope = { v: spec.version, data: value };
      store.write(key, JSON.stringify(envelope));
    },
  };
}
