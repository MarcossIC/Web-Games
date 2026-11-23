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
