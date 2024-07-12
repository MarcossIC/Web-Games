export interface iGAMES {
  ID: string;
  IMG: string;
  NAME: string;
  ALT: string;
  PATH: string;
  priority?: boolean;
}

export const GAMES: iGAMES[] = [
  {
    ID: 'TETRIS-GAME',
    IMG: 'https://res.cloudinary.com/dd8ep4kjo/image/upload/v1720746510/tetris-frontpage_xafjo0.webp',
    NAME: 'Tetris',
    ALT: 'Tetris front page image',
    PATH: '/tetris',
    priority: true,
  },
  {
    ID: 'SNAKE-GAME',
    IMG: 'https://res.cloudinary.com/dd8ep4kjo/image/upload/v1720746519/snake-frontpage_g4z1wy.webp',
    NAME: 'Snake Clasic',
    ALT: 'Snake Clasic front page image',
    PATH: '/snakeling',
  },
  {
    ID: 'TTT-GAME',
    IMG: 'https://res.cloudinary.com/dd8ep4kjo/image/upload/v1720746514/ttt-frontpage_uxcqzv.webp',
    NAME: 'Tic Tac Toe',
    ALT: 'Tic Tac Toe front page image',
    PATH: '/tictactoe',
  },
  {
    ID: 'MEMORAMA-GAME',
    IMG: 'https://res.cloudinary.com/dd8ep4kjo/image/upload/v1720746524/memorama-frontpage_fvdiis.webp',
    NAME: 'Memorama',
    ALT: 'Memorama front page image',
    PATH: '/memorama',
    priority: true,
  },
  {
    ID: 'CHESS-GAME',
    IMG: 'https://res.cloudinary.com/dd8ep4kjo/image/upload/v1720746534/chess-frontpage_hkkgpj.webp',
    NAME: 'Chess',
    ALT: 'Chess front page image',
    PATH: '/chess',
    priority: true,
  },
];
