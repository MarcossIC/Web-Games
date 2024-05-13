import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    title: 'Game Galaxy',
    loadComponent: () => import('@app-pages/start/start.component'),
  },
  {
    path: 'games',
    title: 'Game Galaxy - Games',
    loadComponent: () => import('@app-pages/games/games.component'),
  },
  {
    path: 'tetris',
    title: 'Game Galaxy - Tetris',
    loadComponent: () => import('@app-pages/tetris/tetris.component'),
  },
  {
    path: 'snakeling',
    title: 'Game Galaxy - Snakeling',
    loadChildren: () =>
      import('@app-pages/snakeling/snakeling.module').then(
        (m) => m.SnakelingModule
      ),
  },
  {
    path: 'tictactoe',
    title: 'Game Galaxy - Tic tac toe',
    loadChildren: () =>
      import('@app-pages/tictactoe/tictactoe.module').then(
        (m) => m.TictactoeModule
      ),
  },
  {
    path: 'memorama',
    title: 'Game Galaxy - Memorama',
    loadChildren: () =>
      import('@app-pages/memorama/memorama.module').then(
        (m) => m.MemoramaModule
      ),
  },
  {
    path: 'chess',
    title: 'Game Galaxy - Chess',
    loadComponent: () => import('@app-pages/chess/chess.component'),
  },
  {
    path: '**',
    title: 'GG - Not found',
    loadComponent: () => import('@app-pages/notfound/notfound.component'),
  },
];

export default routes;
