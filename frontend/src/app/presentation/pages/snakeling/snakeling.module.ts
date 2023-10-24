import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnakelingComponent } from './snakeling.component';
import { SnakelingRoutes } from './snakeling.routing';
import { SnakelingControllerService } from '@app/data/services/snakeling/SnakelingController.service';
import { BoardServiceService } from '@app/data/services/snakeling/BoardService.service';
import { FoodService } from '@app/data/services/snakeling/Food.service';
import { SnakeService } from '@app/data/services/snakeling/Snake.service';
import { ScoreService } from '@app/data/services/snakeling/Score.service';
import { WelcomeSnakelingModalComponent } from '@app/presentation/components/welcome-snakeling-modal/welcome-snakeling-modal.component';
import { EndgameModalSnakelingComponent } from '@app/presentation/components/endgame-modal-snakeling/endgame-modal-snakeling.component';

@NgModule({
  imports: [
    CommonModule, SnakelingRoutes, WelcomeSnakelingModalComponent, EndgameModalSnakelingComponent
  ],
  declarations: [SnakelingComponent],
  providers: [
    SnakelingControllerService, 
    BoardServiceService, 
    FoodService, 
    SnakeService,
    ScoreService
  ],
  exports: [SnakelingComponent],
  bootstrap: [SnakelingComponent]
})
export class SnakelingModule { }
