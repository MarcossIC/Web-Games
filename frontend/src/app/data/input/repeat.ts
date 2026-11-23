/**
 * Whether a key's current hold began with a real press. A key still held
 * from before (the R that just restarted the run, or one held through a
 * pause) comes back through the keyboard's repeats, and those do not count.
 */
export function isFreshPress(event: { repeat: boolean } | undefined): boolean {
  return event !== undefined && !event.repeat;
}
