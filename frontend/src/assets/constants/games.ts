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
    IMG: '../../../../assets/images/tetris-frontpage.webp',
    NAME: 'Tetris',
    ALT: 'Tetris front page image',
    PATH: '/tetris',
    priority: true,
  },
  {
    ID: 'SNAKE-GAME',
    IMG: '../../../../assets/images/snake-frontpage.webp',
    NAME: 'Snake Clasic',
    ALT: 'Snake Clasic front page image',
    PATH: '/snakeling',
  },
  {
    ID: 'TTT-GAME',
    IMG: '../../../../assets/images/ttt-frontpage.webp',
    NAME: 'Tic Tac Toe',
    ALT: 'Tic Tac Toe front page image',
    PATH: '/tictactoe',
  },
  {
    ID: 'MEMORAMA-GAME',
    IMG: '../../../../assets/images/memorama-frontpage.png',
    NAME: 'Memorama',
    ALT: 'Memorama front page image',
    PATH: '/memorama',
    priority: true,
  },
  {
    ID: 'CHESS-GAME',
    IMG: '../../../../assets/images/chess-frontpage.webp',
    NAME: 'Chess',
    ALT: 'Chess front page image',
    PATH: '/chess',
    priority: true,
  },
];
