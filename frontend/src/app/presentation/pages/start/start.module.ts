import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StartComponent } from './start.component';
import { ParticlesComponent } from '@app-components/particles/particles.component';
import { StartRoutes } from './start.routing';

@NgModule({
  imports: [
    CommonModule, ParticlesComponent, StartRoutes
  ],
  declarations: [
    StartComponent
  ],
  exports: [StartComponent],
  bootstrap: []
})
export class StartModule { }
