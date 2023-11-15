import { Routes, RouterModule } from '@angular/router';
import { MemoramaComponent } from './memorama.component';

const routes: Routes = [
  {  
    path: '',
    component: MemoramaComponent
  },
];

export const MemoramaRoutes = RouterModule.forChild(routes);
