/**
 * Where the saved data lives: localStorage today, anything that answers
 * these three calls tomorrow. A store never throws: a value it cannot keep
 * is simply not there on the next visit.
 */
export interface KeyValueStore {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}
