import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  {  
    path: '',
    loadChildren: ()=> import("@app-pages/start/start.module").then(m => m.StartModule)
  },
  {
    path: 'games',
    loadChildren: () => import("@app-pages/games/games.module").then(m => m.GamesModule)
  },
  {
    path: 'tetris',
    loadChildren: () => import("@app-pages/tetris/tetris.module").then(m => m.TetrisModule)
  },
  {
    path: 'snakeling',
    loadChildren: () => import("@app-pages/snakeling/snakeling.module").then(m => m.SnakelingModule)
  },
  {
    path: 'tictactoe',
    loadChildren: () => import("@app-pages/tictactoe/tictactoe.module").then(m => m.TictactoeModule)
  },
  {
    path: '**',
    loadChildren: () => import("@app-pages/notfound/notfound.module").then(m => m.NotfoundModule)
  }
];

export const AppRoutes = RouterModule.forRoot(routes);
