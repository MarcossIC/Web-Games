import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GamesComponent } from './games.component';
import { GamesRoutes } from './games.routing';

@NgModule({
  imports: [
    CommonModule, GamesRoutes
  ],
  declarations: [GamesComponent],
  exports: [GamesComponent],
  bootstrap: [GamesComponent]
})
export class GamesModule { }
