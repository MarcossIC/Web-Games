/** What `fontsReady` needs of `document.fonts`. */
export interface FontLoader {
  load(font: string): Promise<unknown>;
}

/**
 * Resolves once every font in `fonts` (CSS shorthands, as '16px Silkscreen')
 * can be drawn with, or after `timeoutMs`, whichever comes first.
 *
 * The game writes on a canvas, and a canvas does not wait for a typeface:
 * text drawn before it arrives stays in the browser's fallback until it is
 * drawn again. On a phone nothing else on the page asks for the typefaces
 * (the bar that uses them is hidden), so the game has to.
 *
 * It never rejects: without a typeface the game still starts.
 */
export function fontsReady(
  loader: FontLoader | undefined,
  fonts: readonly string[],
  timeoutMs: number
): Promise<void> {
  if (!loader) return Promise.resolve();
  return new Promise<void>((done) => {
    const timer = setTimeout(done, timeoutMs);
    const finish = () => {
      clearTimeout(timer);
      done();
    };
    Promise.all(fonts.map((font) => loader.load(font))).then(finish, finish);
  });
}
