import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TictactoeComponent } from './tictactoe.component';
import { TictactoeRoutes } from './tictactoe.routing';
import { ParticlesComponent } from '@app-components/particles/particles.component';
import { SelectModalTttComponent } from '@app-components/select-modal-ttt/select-modal-ttt.component';
import { DisplayInfoComponent } from '@app-components/display-info/display-info.component';
import { GameStateService } from '@app/data/services/tictactoe/GameState.service';
import { SecondPlayerService } from '@app/data/services/tictactoe/SecondPlayer.service';
import { UserPlayerService } from '@app/data/services/tictactoe/UserPlayer.service';
import { TicTacToeControllerService } from '@app/data/services/tictactoe/TicTacToeController.service';
import { EndgameModalTttComponent } from '@app/presentation/components/endgame-modal-ttt/endgame-modal-ttt.component';

@NgModule({
  imports: [
    CommonModule, 
    TictactoeRoutes, 
    ParticlesComponent, 
    SelectModalTttComponent,
    DisplayInfoComponent,
    EndgameModalTttComponent
  ],
  declarations: [TictactoeComponent],
  providers: [
    GameStateService,
    SecondPlayerService,
    UserPlayerService,
    TicTacToeControllerService
  ],
  exports: [TictactoeComponent],
  bootstrap: [TictactoeComponent]
})
export class TictactoeModule { }
