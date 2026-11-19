import { darken, hexToNumber, lighten, mix, parseHex, rgba, rgbToHex } from './color';

describe('breaker color math', () => {
  describe('parseHex', () => {
    it('reads #rrggbb', () => {
      expect(parseHex('#ff2e88')).toEqual({ r: 255, g: 46, b: 136 });
    });

    it('reads the short #rgb form and a missing #', () => {
      expect(parseHex('#fa0')).toEqual({ r: 255, g: 170, b: 0 });
      expect(parseHex('5ee6ff')).toEqual({ r: 94, g: 230, b: 255 });
    });

    it('ignores case and surrounding spaces', () => {
      expect(parseHex('  #FF2E88 ')).toEqual({ r: 255, g: 46, b: 136 });
    });

    it('throws on anything that is not a hex color', () => {
      for (const bad of ['', '#', '#12', '#12345', '#ggg', 'red', '#1234567']) {
        expect(() => parseHex(bad)).withContext(bad).toThrowError(/hex color/);
      }
    });
  });

  it('writes a color back as lowercase #rrggbb, rounding and clamping each channel', () => {
    expect(rgbToHex({ r: 255, g: 46, b: 136 })).toBe('#ff2e88');
    expect(rgbToHex({ r: 300, g: -4, b: 10.6 })).toBe('#ff000b');
  });

  it('turns a hex color into the 0xRRGGBB number Phaser tints take', () => {
    expect(hexToNumber('#ff2e88')).toBe(0xff2e88);
    expect(hexToNumber('#000')).toBe(0);
  });

  describe('mix, lighten and darken', () => {
    it('mixes two colors channel by channel', () => {
      expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
      expect(mix('#ff0000', '#0000ff', 0)).toBe('#ff0000');
      expect(mix('#ff0000', '#0000ff', 1)).toBe('#0000ff');
    });

    it('clamps the amount to 0..1', () => {
      expect(mix('#ff0000', '#0000ff', -2)).toBe('#ff0000');
      expect(mix('#ff0000', '#0000ff', 7)).toBe('#0000ff');
    });

    it('lightens towards white and darkens towards black', () => {
      expect(lighten('#5ee6ff', 0)).toBe('#5ee6ff');
      expect(lighten('#5ee6ff', 1)).toBe('#ffffff');
      expect(lighten('#000000', 0.25)).toBe('#404040');
      expect(darken('#5ee6ff', 1)).toBe('#000000');
      expect(darken('#ffffff', 0.5)).toBe('#808080');
    });
  });

  it('writes a CSS rgba() with the alpha clamped to 0..1', () => {
    expect(rgba('#ff2e88', 0.5)).toBe('rgba(255, 46, 136, 0.5)');
    expect(rgba('#fff', 3)).toBe('rgba(255, 255, 255, 1)');
    expect(rgba('#fff', -1)).toBe('rgba(255, 255, 255, 0)');
  });
});
