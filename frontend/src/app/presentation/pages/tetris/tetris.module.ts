import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TetrisComponent } from './tetris.component';
import { TetrisRoutes } from './tetris.routing';
import { TetrisControllerService } from '@app-services/tetris/TetrisController.service';
import { BoardService } from '@app-services/tetris/Board.service';
import { PieceService } from '@app-services/tetris/Piece.service';
import { BagOfPiecesService } from '@app-services/tetris/BagOfPieces.service';
import { PointsService } from '@app-services/tetris/Points.service';
import { NextPieceBoardService } from '@app-services/tetris/NextPieceBoard.service';
import { ParticlesComponent } from '@app-components/particles/particles.component';
import { ChronometerComponent } from '@app-components/chronometer/chronometer.component';
import { UtilService } from '@app-services/util.service';
import { WelcomeTetrisModalComponent } from '@app-components/welcome-tetris-modal/welcome-tetris-modal.component';
import { EndgameModalTetrisComponent } from '@app-components/endgame-modal-tetris/endgame-modal-tetris.component';

@NgModule({
  imports: [
    CommonModule, TetrisRoutes, 
    ParticlesComponent, 
    ChronometerComponent,
    WelcomeTetrisModalComponent, 
    EndgameModalTetrisComponent
  ],
  declarations: [
    TetrisComponent
  ],
  exports: [TetrisComponent],
  providers: [
    TetrisControllerService, 
    BoardService, 
    PieceService, 
    BagOfPiecesService, 
    PointsService, 
    NextPieceBoardService,
    UtilService
  ],
  bootstrap: [TetrisComponent]
})
export class TetrisModule { }
