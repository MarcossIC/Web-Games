import * as Phaser from 'phaser';

/**
 * A CanvasTexture keeps a copy of all its pixels (`imageData`, `data`,
 * `buffer`, `pixels`) for getPixel and friends, which the game never calls.
 * The textures are painted once at boot, so those copies are only weight:
 * several MB the garbage collector has to walk on every major collection.
 * WebGL uploads from the canvas itself, so dropping them changes nothing on
 * screen. Returns how many textures were released.
 */
export function releasePixelSnapshots(textures: Iterable<unknown>): number {
  let released = 0;
  for (const texture of textures) {
    if (!(texture instanceof Phaser.Textures.CanvasTexture)) continue;
    const held = texture as unknown as Record<'imageData' | 'data' | 'buffer' | 'pixels', unknown>;
    held.imageData = null;
    held.data = null;
    held.buffer = null;
    held.pixels = null;
    released++;
  }
  return released;
}
