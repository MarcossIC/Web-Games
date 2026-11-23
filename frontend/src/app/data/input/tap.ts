/**
 * Taps on buttons: a finger that goes down on a button and comes up on the
 * same one. Sliding off before lifting cancels it, as on any button, and a
 * button acts on the release: no finger is left down on whatever comes next.
 */
export class TapTracker<Key> {
  /** The button each finger went down on. */
  private readonly started = new Map<number, Key>();

  /** `hit` says which button, if any, is at a point. */
  constructor(private readonly hit: (x: number, y: number) => Key | null) {}

  /** A finger went down. Returns the button under it, if any. */
  down(finger: number, x: number, y: number): Key | null {
    const key = this.hit(x, y);
    if (key === null) this.started.delete(finger);
    else this.started.set(finger, key);
    return key;
  }

  /** A finger came up. Returns the button it tapped, if it did. */
  up(finger: number, x: number, y: number): Key | null {
    const key = this.started.get(finger);
    this.started.delete(finger);
    if (key === undefined) return null;
    return this.hit(x, y) === key ? key : null;
  }

  /** A finger that started on `key` is still down. */
  isPressed(key: Key): boolean {
    for (const pressed of this.started.values()) {
      if (pressed === key) return true;
    }
    return false;
  }

  /** Forgets every finger: the buttons moved, or are gone. */
  clear(): void {
    this.started.clear();
  }
}
