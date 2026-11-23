/** What CanvasPointerLock needs from document. */
export type PointerLockHost = Pick<Document, 'pointerLockElement' | 'exitPointerLock' | 'addEventListener' | 'removeEventListener'>;

/**
 * Keeps the mouse inside the game's canvas while a run is played (Pointer
 * Lock API): the cursor hides and only its motion arrives, so a fast swipe
 * can no longer leave the canvas and stall the paddle.
 *
 * The browser grants a lock only after a user gesture (a click, or a key
 * other than Esc) and drops it on Esc or a lost focus. A refused request is
 * swallowed: `retry` (a press on the canvas, itself a gesture) asks again.
 * `onLost` hears only a lock the browser broke while it was still wanted,
 * with the event's timeStamp; releasing it with set(false) stays quiet.
 */
export class CanvasPointerLock {
  private wanted = false;
  private held = false;

  constructor(
    private readonly doc: PointerLockHost,
    private readonly element: () => HTMLElement | null,
    private readonly onLost: (timeStamp: number) => void
  ) {
    doc.addEventListener('pointerlockchange', this.onChange);
  }

  get locked(): boolean {
    const element = this.element();
    return element !== null && this.doc.pointerLockElement === element;
  }

  set(wanted: boolean): void {
    this.wanted = wanted;
    if (wanted) this.request();
    else if (this.locked) this.doc.exitPointerLock();
  }

  /** A press on the canvas: the gesture a refused lock was missing (a resume with Esc). */
  retry(): void {
    if (this.wanted) this.request();
  }

  destroy(): void {
    this.wanted = false;
    this.doc.removeEventListener('pointerlockchange', this.onChange);
    if (this.locked) this.doc.exitPointerLock();
  }

  private request(): void {
    const element = this.element();
    if (!element || this.locked || typeof element.requestPointerLock !== 'function') return;
    try {
      // A promise where supported (it rejects without a gesture), undefined in older browsers.
      const pending = element.requestPointerLock() as Promise<void> | undefined;
      pending?.catch?.(() => undefined);
    } catch {
      // Refused synchronously: the run plays with a free cursor until the next press.
    }
  }

  private readonly onChange = (event: Event): void => {
    const locked = this.locked;
    const lost = this.held && !locked && this.wanted;
    this.held = locked;
    if (lost) this.onLost(event.timeStamp);
  };
}
