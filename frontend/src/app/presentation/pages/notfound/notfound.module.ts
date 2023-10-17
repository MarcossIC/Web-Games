import { NgModule } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { NotfoundComponent } from './notfound.component';
import { NotfoundRoutes } from './notfound.routing';
import { ParticlesComponent } from '@app/presentation/components/particles/particles.component';

@NgModule({
  imports: [
    CommonModule, NotfoundRoutes, ParticlesComponent, NgOptimizedImage
  ],
  declarations: [NotfoundComponent],
  providers: [],
  exports: [NotfoundComponent],
  bootstrap: [NotfoundComponent]

})
export class NotfoundModule { }
