import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GAME_STORE, memoryStore } from '@app-persistence';
import { BagOfPiecesService } from '@app/data/services/tetris/BagOfPieces.service';
import { BoardService } from '@app/data/services/tetris/Board.service';
import { NextPieceBoardService } from '@app/data/services/tetris/NextPieceBoard.service';
import { PieceService } from '@app/data/services/tetris/Piece.service';
import { PointsService } from '@app/data/services/tetris/Points.service';
import { TetrisControllerService } from '@app/data/services/tetris/TetrisController.service';
import { WelcomeTetrisModalComponent } from './welcome-tetris-modal.component';

describe('WelcomeTetrisModalComponent', () => {
  let fixture: ComponentFixture<WelcomeTetrisModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomeTetrisModalComponent],
      // The same providers the Tetris route declares in app.routing.ts.
      providers: [
        provideRouter([]),
        { provide: GAME_STORE, useValue: memoryStore() },
        TetrisControllerService,
        PointsService,
        PieceService,
        NextPieceBoardService,
        BoardService,
        BagOfPiecesService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WelcomeTetrisModalComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
