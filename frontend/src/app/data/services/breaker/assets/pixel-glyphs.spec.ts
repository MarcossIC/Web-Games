import { GLYPH_SIZE, PIXEL_GLYPHS, QUESTION_GLYPH, glyphCells } from './pixel-glyphs';

describe('breaker pixel glyphs', () => {
  const all = { ...PIXEL_GLYPHS, question: QUESTION_GLYPH };

  it('draws every glyph on the same 7x7 grid with only # and .', () => {
    expect(GLYPH_SIZE).toBe(7);
    for (const [name, rows] of Object.entries(all)) {
      expect(rows.length).withContext(name).toBe(GLYPH_SIZE);
      for (const row of rows) {
        expect(row).withContext(name).toMatch(/^[#.]{7}$/);
      }
    }
  });

  it('gives each power-up a different picture', () => {
    const pictures = Object.values(PIXEL_GLYPHS).map((rows) => rows.join('/'));

    expect(new Set(pictures).size).toBe(pictures.length);
    expect(Object.keys(PIXEL_GLYPHS).length).toBe(11);
  });

  it('lists the lit cells of a glyph as column and row', () => {
    const cells = glyphCells(['#......', '.......', '.......', '.......', '.......', '.......', '......#']);

    expect(cells).toEqual([
      { col: 0, row: 0 },
      { col: 6, row: 6 },
    ]);
  });
});
