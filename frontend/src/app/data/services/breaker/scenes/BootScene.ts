import { isDevMode } from '@angular/core';
import * as Phaser from 'phaser';
import { BreakerTexture } from '@app/data/models/breaker/BreakerKeys';
import { releasePixelSnapshots } from '../assets/release-snapshots';
import { drawTextureSheet, generateBreakerTextures } from '../assets/texture-factory';
import { buildBitmapFonts } from '../view/bitmap-fonts';
import { readBreakerFlags } from '../view/looks';
import { BreakerSceneKeys } from './scene-keys';

/** This long at most is spent waiting; past it the bitmap fonts are baked from the fallback font. */
export const FONT_WAIT_MS = 1500;
const FONTS = ['16px Silkscreen', '32px Audiowide'];

/**
 * Builds the textures, which the game paints in code (no loader), waits for
 * the web fonts, bakes the bitmap fonts from them (baked before the fonts
 * load, they would hold the fallback font for good), then starts the game,
 * or shows the texture sheet with `?sheet=1` for an art review (dev builds only).
 */
export class BootScene extends Phaser.Scene {
  private gone = false;

  constructor() {
    super(BreakerSceneKeys.BOOT);
  }

  create(): void {
    this.gone = false;
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onGone, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onGone, this);

    const flags = readBreakerFlags(typeof window === 'undefined' ? '' : window.location.search, isDevMode());
    if (flags.sheet) {
      drawTextureSheet(this);
      return;
    }
    generateBreakerTextures(this);
    // crt-overlay already has scanlines and vignette baked in; the stars are
    // sprites. These full-screen canvases would only hold memory.
    for (const key of [BreakerTexture.SCANLINES, BreakerTexture.VIGNETTE, BreakerTexture.BG_STARS]) {
      if (this.textures.exists(key)) this.textures.remove(key);
    }
    void waitForFonts(FONT_WAIT_MS).then(() => {
      // The game may have been destroyed (the route left) while the fonts loaded.
      if (this.gone) return;
      buildBitmapFonts(this);
      releasePixelSnapshots(Object.values(this.textures.list));
      this.scene.start(BreakerSceneKeys.GAME);
    });
  }

  private onGone(): void {
    this.gone = true;
  }
}

/** Resolves when the fonts are in, or after `capMs`, whichever comes first. Never rejects. */
export function waitForFonts(capMs: number): Promise<void> {
  const fonts = typeof document === 'undefined' ? undefined : document.fonts;
  if (!fonts) return Promise.resolve();
  const loads = Promise.all(FONTS.map((font) => fonts.load(font))).then(
    () => undefined,
    () => undefined
  );
  const cap = new Promise<void>((resolve) => setTimeout(resolve, capMs));
  return Promise.race([loads, cap]);
}
