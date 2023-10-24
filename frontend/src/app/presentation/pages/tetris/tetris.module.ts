import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TetrisComponent } from './tetris.component';
import { TetrisRoutes } from './tetris.routing';
import { TetrisControllerService } from '@app/data/services/tetris/TetrisController.service';
import { BoardService } from '@app/data/services/tetris/Board.service';
import { PieceService } from '@app/data/services/tetris/Piece.service';
import { BagOfPiecesService } from '@app/data/services/tetris/BagOfPieces.service';
import { PointsService } from '@app/data/services/tetris/Points.service';
import { NextPieceBoardService } from '@app/data/services/tetris/NextPieceBoard.service';
import { ParticlesComponent } from '@app-components/particles/particles.component';
import { ChronometerComponent } from '@app/presentation/components/chronometer/chronometer.component';
import { UtilService } from '@app/data/services/util.service';
import { WelcomeTetrisModalComponent } from '@app/presentation/components/welcome-tetris-modal/welcome-tetris-modal.component';
import { EndgameModalTetrisComponent } from '@app/presentation/components/endgame-modal-tetris/endgame-modal-tetris.component';

@NgModule({
  imports: [
    CommonModule, TetrisRoutes, 
    ParticlesComponent, 
    WelcomeTetrisModalComponent, 
    EndgameModalTetrisComponent
  ],
  declarations: [
    ChronometerComponent,
    
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
