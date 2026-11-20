import * as Phaser from 'phaser';
import { releasePixelSnapshots } from './release-snapshots';

/** A CanvasTexture as Phaser leaves it: holding a copy of its pixels. */
function fakeCanvasTexture(): Phaser.Textures.CanvasTexture {
  const texture = Object.create(Phaser.Textures.CanvasTexture.prototype) as any;
  texture.imageData = { data: new Uint8ClampedArray(16) };
  texture.data = texture.imageData.data;
  texture.buffer = texture.data.buffer;
  texture.pixels = new Uint32Array(texture.buffer);
  return texture;
}

describe('releasePixelSnapshots', () => {
  it('drops the pixel copies a CanvasTexture keeps, and counts them', () => {
    const canvas = fakeCanvasTexture() as any;

    const released = releasePixelSnapshots([canvas]);

    expect(released).toBe(1);
    expect(canvas.imageData).toBeNull();
    expect(canvas.data).toBeNull();
    expect(canvas.buffer).toBeNull();
    expect(canvas.pixels).toBeNull();
  });

  it('leaves textures that are not canvases alone', () => {
    const image = { key: 'ball', imageData: 'kept' } as any;

    const released = releasePixelSnapshots([image]);

    expect(released).toBe(0);
    expect(image.imageData).toBe('kept');
  });
});
