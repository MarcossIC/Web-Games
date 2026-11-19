import * as Phaser from 'phaser';
import {
  BITMAP_FONTS,
  buildBitmapFonts,
  type GlyphMetrics,
  glyphList,
  layoutFont,
  letterSpacingUnits,
  pickBitmapFont,
  addLabel,
} from './bitmap-fonts';
import { FONT } from './scene-kit';

function glyph(char: string, advance: number, ascent = 10, descent = 2): GlyphMetrics {
  return { char, advance, left: 0, right: advance, ascent, descent };
}

describe('bitmap-fonts', () => {
  describe('glyphList', () => {
    it('has printable ASCII plus the middle dot and the multiplication sign, once each', () => {
      const list = glyphList();
      expect(list.length).toBe(95 + 2);
      expect(list[0]).toBe(' ');
      expect(list).toContain('~');
      expect(list).toContain('·');
      expect(list).toContain('×');
      expect(new Set(list).size).toBe(list.length);
    });

    it('covers every character the HUD and the banners show', () => {
      const shown = 'SECTOR 01 · SYNTHWAVE 1:23.45 / PAR 0:40 x2.5 +1,200 12 COMBO SHIFT · NOVA +1 UP PERFECT';
      const list = new Set(glyphList());
      for (const ch of shown) expect(list.has(ch)).withContext(ch).toBeTrue();
    });
  });

  describe('pickBitmapFont', () => {
    it('merges near sizes into the few baked ones', () => {
      expect(pickBitmapFont(FONT.PIXEL, 10).key).toBe(pickBitmapFont(FONT.PIXEL, 13).key);
      expect(pickBitmapFont(FONT.PIXEL, 16).key).toBe(pickBitmapFont(FONT.PIXEL, 18).key);
      expect(pickBitmapFont(FONT.PIXEL, 11).key).not.toBe(pickBitmapFont(FONT.PIXEL, 18).key);
      expect(pickBitmapFont(FONT.DISPLAY, 18).key).toBe(pickBitmapFont(FONT.DISPLAY, 22).key);
      expect(pickBitmapFont(FONT.DISPLAY, 56).bakeSize).toBe(112);
    });

    it('bakes every size it serves at about 2x (never under 1.6x nor over 2.6x)', () => {
      const used: [string, number[]][] = [
        [FONT.PIXEL, [10, 11, 12, 13, 16, 18]],
        [FONT.DISPLAY, [18, 20, 22, 28, 56]],
      ];
      for (const [family, sizes] of used) {
        for (const size of sizes) {
          const ratio = pickBitmapFont(family, size).bakeSize / size;
          expect(ratio).withContext(`${family} ${size}`).toBeGreaterThanOrEqual(1.6);
          expect(ratio).withContext(`${family} ${size}`).toBeLessThanOrEqual(2.6);
        }
      }
    });

    it('throws for a family with no baked font', () => {
      expect(() => pickBitmapFont('Comic Sans', 12)).toThrowError(/No bitmap font/);
    });
  });

  it('converts letter spacing from shown px to font units', () => {
    expect(letterSpacingUnits(2, 11, 24)).toBeCloseTo((2 * 24) / 11, 6);
    expect(letterSpacingUnits(0, 11, 24)).toBe(0);
  });

  describe('layoutFont', () => {
    const glyphs = [glyph(' ', 5), glyph('A', 10), glyph('B', 9.5), glyph('g', 8, 7, 4)];

    it('keeps the Text line box: lineHeight is ascent + descent of the test string', () => {
      const layout = layoutFont(glyphs, 10, 2, 3);
      expect(layout.lineHeight).toBe(12);
      expect(layout.ascent).toBe(10);
    });

    it('gives each glyph a padded cell, a blank space, and the measured advance', () => {
      const layout = layoutFont(glyphs, 10, 2, 3);
      const space = layout.chars[32];
      expect(space.width).toBe(0);
      expect(space.xAdvance).toBe(5);
      const a = layout.chars['A'.charCodeAt(0)];
      // Cell: ink 10 + 2 * pad 3; height: ascent 10 + deepest descent 4 + 2 * pad.
      expect(a.width).toBe(16);
      expect(a.height).toBe(20);
      expect(a.xAdvance).toBe(10);
      expect(a.xOffset).toBe(-3);
      // The cell top sits pad above the line top.
      expect(a.yOffset).toBe(-3);
      expect(layout.chars['B'.charCodeAt(0)].xAdvance).toBe(9.5);
    });

    it('never overlaps cells and keeps them inside the atlas', () => {
      const many = glyphList().map((ch) => glyph(ch, 40, 30, 8));
      const layout = layoutFont(many, 30, 8, 4, 512);
      expect(layout.width).toBeLessThanOrEqual(512);
      const cells = layout.cells.filter((c) => c.w > 0);
      for (const c of cells) {
        expect(c.x + c.w).toBeLessThanOrEqual(layout.width);
        expect(c.y + c.h).toBeLessThanOrEqual(layout.height);
      }
      for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
          const a = cells[i];
          const b = cells[j];
          const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
          expect(apart).withContext(`${a.char} / ${b.char}`).toBeTrue();
        }
      }
    });

    it('builds UVs the Phaser 4 way (V flipped, like Frame.updateUVs)', () => {
      const layout = layoutFont(glyphs, 10, 2, 3);
      const a = layout.chars['A'.charCodeAt(0)];
      expect(a.u0).toBeCloseTo(a.x / layout.width, 9);
      expect(a.u1).toBeCloseTo((a.x + a.width) / layout.width, 9);
      expect(a.v0).toBeCloseTo(1 - a.y / layout.height, 9);
      expect(a.v1).toBeCloseTo(1 - (a.y + a.height) / layout.height, 9);
      expect(a.v0).toBeGreaterThan(a.v1);
    });

    it('makes room for ink left of the pen', () => {
      const layout = layoutFont([{ char: 'j', advance: 6, left: 2, right: 6, ascent: 9, descent: 3 }], 10, 2, 1);
      const j = layout.chars['j'.charCodeAt(0)];
      expect(j.width).toBe(2 + 6 + 2);
      expect(j.xOffset).toBe(-3);
    });
  });

  describe('in a real Phaser game', () => {
    let game: Phaser.Game | null = null;

    afterEach(() => {
      game?.destroy(true);
      game = null;
    });

    function boot(): Promise<Phaser.Scene> {
      return new Promise((resolve) => {
        game = new Phaser.Game({
          type: Phaser.CANVAS,
          width: 200,
          height: 100,
          banner: false,
          audio: { noAudio: true },
          scene: {
            create(this: Phaser.Scene) {
              resolve(this);
            },
          },
        });
      });
    }

    it('registers every font with a texture and a glyph for each character', async () => {
      const scene = await boot();
      buildBitmapFonts(scene);
      for (const spec of BITMAP_FONTS) {
        const entry = scene.cache.bitmapFont.get(spec.key);
        expect(entry).withContext(spec.key).toBeTruthy();
        expect(scene.textures.exists(spec.key)).toBeTrue();
        expect(entry.data.size).toBe(spec.bakeSize);
        expect(entry.data.lineHeight).toBeGreaterThan(spec.bakeSize * 0.5);
        for (const ch of glyphList()) expect(entry.data.chars[ch.charCodeAt(0)]).withContext(`${spec.key} ${ch}`).toBeDefined();
        const w = entry.data.chars['W'.charCodeAt(0)];
        expect(w.width).toBeGreaterThan(0);
        expect(w.xAdvance).toBeGreaterThan(0);
      }
    });

    it('shows a label at the asked size, tinted, with letter spacing in shown px', async () => {
      const scene = await boot();
      const plain = addLabel(scene, 0, 0, 'SCORE', FONT.PIXEL, 11, '#a7a1c6');
      const spaced = addLabel(scene, 0, 0, 'SCORE', FONT.PIXEL, 11, '#a7a1c6', { spacing: 2, originX: 1 });
      expect(plain).toBeInstanceOf(Phaser.GameObjects.BitmapText);
      expect(plain.fontSize).toBe(11);
      expect(plain.tintTopLeft).toBe(0xa7a1c6);
      // Four gaps of 2 shown px between five letters.
      expect(spaced.width - plain.width).toBeCloseTo(8, 3);
      expect(spaced.originX).toBe(1);
      // About as tall as an 11 px line, not the baked 24 px one.
      expect(plain.height).toBeGreaterThan(6);
      expect(plain.height).toBeLessThan(16);
    });
  });
});
