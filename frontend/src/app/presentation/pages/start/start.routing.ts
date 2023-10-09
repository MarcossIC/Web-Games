import { Routes, RouterModule } from '@angular/router';
import { StartComponent } from './start.component';

const routes: Routes = [
  { 
    path: '',
    component: StartComponent
   },
];

export const StartRoutes = RouterModule.forChild(routes);
