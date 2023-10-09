import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  {  
    path: '',
    loadChildren: ()=> import("@app-pages/start/start.module").then(m => m.StartModule)
  },
];

export const AppRoutes = RouterModule.forRoot(routes);
