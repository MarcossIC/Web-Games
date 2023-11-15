import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemoramaComponent } from './memorama.component';
import { MemoramaRoutes } from './memorama.routing';
import { ParticlesComponent } from '@app-components/particles/particles.component';
import { ChronometerComponent } from '@app/presentation/components/chronometer/chronometer.component';
import { EndgameModalMemoramaComponent } from '@app/presentation/components/endgame-modal-memorama/endgame-modal-memorama.component';
import { WelcomeMomeramaModalComponent } from '@app/presentation/components/welcome-momerama-modal/welcome-momerama-modal.component';

@NgModule({
  imports: [
    CommonModule, MemoramaRoutes, 
    ParticlesComponent,
    ChronometerComponent,
    EndgameModalMemoramaComponent,
    WelcomeMomeramaModalComponent
  ],
  declarations: [MemoramaComponent],
  exports: [MemoramaComponent],
  bootstrap: [MemoramaComponent]
})
export class MemoramaModule { }
