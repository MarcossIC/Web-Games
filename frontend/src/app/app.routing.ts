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
    loadChildren: () =>
      import('@app-pages/tetris/tetris.module').then((m) => m.TetrisModule),
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
    loadChildren: () =>
      import('@app-pages/notfound/notfound.module').then(
        (m) => m.NotfoundModule
      ),
  },
];

export default routes;
