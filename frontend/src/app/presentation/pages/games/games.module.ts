import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamesComponent } from './games.component';
import { GamesRoutes } from './games.routing';
import { ParticlesComponent } from '@app-components/particles/particles.component';

@NgModule({
  imports: [
    CommonModule, GamesRoutes, ParticlesComponent
  ],
  declarations: [GamesComponent],
  exports: [GamesComponent],
  bootstrap: [GamesComponent]
})
export class GamesModule { }
