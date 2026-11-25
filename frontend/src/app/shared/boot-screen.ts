/**
 * The boot screen lives in index.html so it animates from the first paint,
 * before any script loads. Once the app has started, this takes it away.
 */

/** The least the boot screen stays, from the start of the page load: less
 * reads as a flash rather than an animation. */
export const BOOT_MIN_VISIBLE_MS = 900;
/** Longer than its exit animation: removes it even if that never ends
 * (a background tab does not run animations). */
export const BOOT_EXIT_FALLBACK_MS = 800;

export function dismissBootScreen(
  doc: Document = document,
  elapsedMs: number = performance.now()
): void {
  const screen = doc.getElementById('gg-boot');
  if (!screen) return;

  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    screen.remove();
  };

  setTimeout(() => {
    screen.addEventListener('animationend', (event) => {
      if (event.target === screen) remove();
    });
    // The exit flies the screen past us, the way the site travels between
    // pages through the galaxy.
    screen.classList.add('is-done');
    setTimeout(remove, BOOT_EXIT_FALLBACK_MS);
  }, Math.max(0, BOOT_MIN_VISIBLE_MS - elapsedMs));
}
