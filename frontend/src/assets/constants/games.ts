export interface iGAMES {
  ID: string;
  IMG: string;
  NAME: string;
  ALT: string;
  PATH: string;
  priority?: boolean;
  /** Two-digit sector number shown on the cartridge. */
  NUM: string;
  /** Accent color of the game across the site. */
  COLOR: string;
  TYPE: string;
  PLAYERS: string;
  CONTROLS: string;
  DESC: string;
  /** 8x8 pixel emblem: 64 characters, one palette key per pixel, '.' = empty. */
  EMBLEM: string;
}

export const GAMES: iGAMES[] = [
  {
    ID: 'TETRIS-GAME',
    IMG: 'https://res.cloudinary.com/dd8ep4kjo/image/upload/v1720746510/tetris-frontpage_xafjo0.webp',
    NAME: 'Tetris',
    ALT: 'Tetris front page image',
    PATH: '/tetris',
    priority: true,
    NUM: '01',
    COLOR: '#ff7ab5',
    TYPE: 'Puzzle',
    PLAYERS: '1 player',
    CONTROLS: 'Keyboard or touch pad',
    DESC: 'Stack the falling pieces and clear lines before the well fills up.',
    EMBLEM:
      '..........MMM......M............C.....YYC..GG.YYC.GG.OOOCPPPPOBB',
  },
  {
    ID: 'SNAKE-GAME',
    IMG: 'https://res.cloudinary.com/dd8ep4kjo/image/upload/v1720746519/snake-frontpage_g4z1wy.webp',
    NAME: 'Snake Clasic',
    ALT: 'Snake Clasic front page image',
    PATH: '/snakeling',
    priority: true,
    NUM: '02',
    COLOR: '#5dfc9a',
    TYPE: 'Arcade',
    PLAYERS: '1 player',
    CONTROLS: 'Keyboard or touch pad',
    DESC: 'Steer the snake, eat the food and do not bite your own tail.',
    EMBLEM:
      '.........GGGGG...G...G...G...G.R.G.......GGGGGG.......G...GGGGG.',
  },
  {
    ID: 'TTT-GAME',
    IMG: 'https://res.cloudinary.com/dd8ep4kjo/image/upload/v1720746514/ttt-frontpage_uxcqzv.webp',
    NAME: 'Tic Tac Toe',
    ALT: 'Tic Tac Toe front page image',
    PATH: '/tictactoe',
    priority: true,
    NUM: '03',
    COLOR: '#8cc4ff',
    TYPE: 'Board',
    PLAYERS: '2 players',
    CONTROLS: 'Mouse or touch',
    DESC: 'Two players take turns. Three in a row takes the round.',
    EMBLEM:
      'R.R..BBB.R...B.BR.R..BBB........BBB..R.RB.B...R.BBB..R.R........',
  },
  {
    ID: 'MEMORAMA-GAME',
    IMG: 'https://res.cloudinary.com/dd8ep4kjo/image/upload/v1720746524/memorama-frontpage_fvdiis.webp',
    NAME: 'Memorama',
    ALT: 'Memorama front page image',
    PATH: '/memorama',
    priority: true,
    NUM: '04',
    COLOR: '#c9a8ff',
    TYPE: 'Memory',
    PLAYERS: '1 player',
    CONTROLS: 'Mouse or touch',
    DESC: 'Flip the cards and find every pair in as few movements as you can.',
    EMBLEM:
      'MMM.CCC.M.M.C.C.MMM.CCC.........PPP.MMM.P.P.M.M.PPP.MMM.........',
  },
  {
    ID: 'CHESS-GAME',
    IMG: 'https://res.cloudinary.com/dd8ep4kjo/image/upload/v1720746534/chess-frontpage_hkkgpj.webp',
    NAME: 'Chess',
    ALT: 'Chess front page image',
    PATH: '/chess',
    priority: true,
    NUM: '05',
    COLOR: '#ece9f7',
    TYPE: 'Strategy',
    PLAYERS: '2 players',
    CONTROLS: 'Drag and drop',
    DESC: 'Checkmate the opposing king, leaving him with no legal moves to escape the attack.',
    EMBLEM:
      '.W.WW.W..WWWWWW...WWWW....WWWW....WWWW....WWWW...WWWWWW.WWWWWWWW',
  },
  {
    ID: 'RUNNER-GAME',
    IMG: 'assets/images/runner-frontpage.png',
    NAME: 'Runner',
    ALT: 'Runner front page image',
    PATH: '/runner',
    priority: true,
    NUM: '06',
    COLOR: '#ffe14a',
    TYPE: 'Platformer',
    PLAYERS: '1 player',
    CONTROLS: 'Keyboard or joystick',
    DESC: 'Run, jump across the platforms and keep moving.',
    EMBLEM:
      '...YY......YY.....CCCC...C.CC.C....CC.....C..C...C....C.GGGGGGGG',
  },
];
