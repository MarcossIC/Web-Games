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
  }
];

export const AppRoutes = RouterModule.forRoot(routes);
