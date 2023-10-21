import { Routes, RouterModule } from '@angular/router';
import { TictactoeComponent } from './tictactoe.component';

const routes: Routes = [
  { 
    path: '',
    component: TictactoeComponent
   },
];

export const TictactoeRoutes = RouterModule.forChild(routes);
