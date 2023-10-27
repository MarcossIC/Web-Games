export interface iGAMES  {
    IMG: string,
    NAME: string,
    ALT: string,
    PATH: string
};

export const GAMES: iGAMES[] = [
    {
        IMG: '../../../../assets/images/tetris-frontpage.webp',
        NAME: 'Tetris',
        ALT: 'Tetris front page image',
        PATH: '/tetris'
    },
    {
        IMG: '../../../../assets/images/snake-frontpage.webp',
        NAME: 'Snake Clasic',
        ALT: 'Snake Clasic front page image',
        PATH: '/snakeling'
    },
    {
        IMG: '../../../../assets/images/ttt-frontpage.webp',
        NAME: 'Tic Tac Toe',
        ALT: 'Tic Tac Toe front page image',
        PATH: '/tictactoe'
    },
];
