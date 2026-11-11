/** What a card shows for one of the values the game deals. */
export interface CardArt {
  name: string;
  /** 8x8 pixel emblem, in the palette of PixelEmblemComponent. */
  emblem: string;
  /** Color the pair takes once it is found. */
  accent: string;
}

const rows = (...lines: string[]) => lines.join('');

/**
 * The deck: one piece of space art per value. The game deals the numbers
 * 1 to 6, twice each, and this is how each number looks.
 */
const DECK: Record<number, CardArt> = {
  1: {
    name: 'Rocket',
    accent: '#ff5c5c',
    emblem: rows(
      '...WW...',
      '..WWWW..',
      '..WCCW..',
      '..WWWW..',
      '.RWWWWR.',
      '.R.WW.R.',
      '...YY...',
      '...OO...'
    ),
  },
  2: {
    name: 'Planet',
    accent: '#b78bff',
    emblem: rows(
      '..PPPP..',
      '.PPPPPP.',
      '.PPPPPPY',
      'YYYYYYYY',
      'YPPPPPP.',
      '.PPPPPP.',
      '..PPPP..',
      '........'
    ),
  },
  3: {
    name: 'Star',
    accent: '#ffe14a',
    emblem: rows(
      '...YY...',
      '...YY...',
      'YYYYYYYY',
      '.YYYYYY.',
      '..YYYY..',
      '.YYYYYY.',
      '.YY..YY.',
      'Y......Y'
    ),
  },
  4: {
    name: 'Invader',
    accent: '#5dfc9a',
    emblem: rows(
      '..G..G..',
      '..GGGG..',
      '.GWGGWG.',
      'GGGGGGGG',
      'G.GGGG.G',
      'G.G..G.G',
      '...GG...',
      '........'
    ),
  },
  5: {
    name: 'Moon',
    accent: '#ece9f7',
    emblem: rows(
      '..WWW...',
      '.WWW....',
      'WWW.....',
      'WWW.....',
      'WWW.....',
      'WWWW...W',
      '.WWWWWW.',
      '..WWWW..'
    ),
  },
  6: {
    name: 'Saucer',
    accent: '#5ee6ff',
    emblem: rows(
      '........',
      '...CC...',
      '..CCCC..',
      '.MMMMMM.',
      'MMWMMWMM',
      '.MMMMMM.',
      '..Y..Y..',
      '.Y....Y.'
    ),
  },
};

/** Shown for a value the deck has no art for, so a card is never blank. */
const UNKNOWN: CardArt = {
  name: 'Card',
  accent: '#ece9f7',
  emblem: rows(
    '..WWWW..',
    '.W....W.',
    '.....WW.',
    '....WW..',
    '...WW...',
    '........',
    '...WW...',
    '........'
  ),
};

export function cardArt(value: number): CardArt {
  return DECK[value] ?? UNKNOWN;
}
