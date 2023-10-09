import { Routes, RouterModule } from '@angular/router';
import { OptionsComponent } from './options.component';

const routes: Routes = [
  {  
    path: '',
    component: OptionsComponent
  },
];

export const OptionsRoutes = RouterModule.forChild(routes);
