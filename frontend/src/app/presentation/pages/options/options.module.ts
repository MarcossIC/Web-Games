import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OptionsComponent } from './options.component';
import { OptionsRoutes } from './options.routing';

@NgModule({
  imports: [
    CommonModule, 
    OptionsRoutes
  ],
  declarations: [OptionsComponent],
  exports: [OptionsComponent],
  bootstrap: [OptionsComponent]
})
export class OptionsModule { }
