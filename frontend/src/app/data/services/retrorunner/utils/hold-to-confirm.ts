/**
 * A key that acts only when held for a while, so brushing it does nothing:
 * restarting throws the run away. It acts once per hold.
 */
export class HoldToConfirm {
  private heldMs = 0;
  /** This hold already acted. */
  private done = false;

  constructor(readonly durationMs: number) {}

  /**
   * Called every frame with the key's state.
   * @returns true on the frame the hold completes
   */
  update(isDown: boolean, deltaMs: number): boolean {
    if (!isDown) {
      this.heldMs = 0;
      this.done = false;
      return false;
    }
    if (this.done) return false;
    this.heldMs += deltaMs;
    this.done = this.heldMs >= this.durationMs;
    return this.done;
  }

  /** How far along the hold is: 0 with the key up, 1 once it acted. */
  get progress(): number {
    return this.done ? 1 : Math.min(1, this.heldMs / this.durationMs);
  }
}

/**
 * Whether a key's current hold began with a real press. A key still held
 * from before (the R that just restarted the run, or one held through a
 * pause) comes back through the keyboard's repeats, and those do not count.
 */
export function isFreshPress(event: { repeat: boolean } | undefined): boolean {
  return event !== undefined && !event.repeat;
}
