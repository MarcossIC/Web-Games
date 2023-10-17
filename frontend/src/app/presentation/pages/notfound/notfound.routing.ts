import { Routes, RouterModule } from '@angular/router';
import { NotfoundComponent } from './notfound.component';

const routes: Routes = [
  {  
    path: '',
    component: NotfoundComponent
  },
];

export const NotfoundRoutes = RouterModule.forChild(routes);
