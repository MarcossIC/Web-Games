import { Routes, RouterModule } from '@angular/router';
import { SnakelingComponent } from './snakeling.component';

const routes: Routes = [
  {  
    path: '',
    component: SnakelingComponent
  },
];

export const SnakelingRoutes = RouterModule.forChild(routes);
