import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamesComponent } from './games.component';
import { GamesRoutes } from './games.routing';
import { ParticlesComponent } from '@app-components/particles/particles.component';
import { NgOptimizedImage } from '@angular/common';

@NgModule({
  imports: [
    CommonModule, GamesRoutes, ParticlesComponent, NgOptimizedImage
  ],
  declarations: [GamesComponent],
  exports: [GamesComponent],
  bootstrap: [GamesComponent]
})
export class GamesModule { }
