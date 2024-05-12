import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    title: 'Game Galaxy',
    loadChildren: () =>
      import('@app-pages/start/start.module').then((m) => m.StartModule),
  },
  {
    path: 'games',
    title: 'Game Galaxy - Games',
    loadChildren: () =>
      import('@app-pages/games/games.module').then((m) => m.GamesModule),
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
    path: '**',
    title: 'GG - Not found',
    loadChildren: () =>
      import('@app-pages/notfound/notfound.module').then(
        (m) => m.NotfoundModule
      ),
  },
];

export default routes;
