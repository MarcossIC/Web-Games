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
        IMG: '../../../../assets/images/dino-frontpage.webp',
        NAME: 'Ajedrez',
        ALT: 'Ajedrez front page image',
        PATH: '/notfound'
    },
    {
        IMG: '../../../../assets/images/ajedrez-frontpage.webp',
        NAME: 'Dino Rush',
        ALT: 'Dino Rush front page image',
        PATH: '/notfound'
    },
];
