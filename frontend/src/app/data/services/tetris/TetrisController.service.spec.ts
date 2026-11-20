import { TestBed } from '@angular/core/testing';
import { BagOfPiecesService } from './BagOfPieces.service';
import { BoardService } from './Board.service';
import { NextPieceBoardService } from './NextPieceBoard.service';
import { PieceService } from './Piece.service';
import { PointsService } from './Points.service';
import { TetrisControllerService } from './TetrisController.service';

describe('TetrisControllerService', () => {
  let controller: TetrisControllerService;

  beforeEach(() => {
    // The same providers the Tetris route declares in app.routing.ts.
    TestBed.configureTestingModule({
      providers: [
        TetrisControllerService,
        PointsService,
        PieceService,
        NextPieceBoardService,
        BoardService,
        BagOfPiecesService,
      ],
    });
    controller = TestBed.inject(TetrisControllerService);
  });

  it('starts paused and has not started yet', () => {
    expect(controller.isPaused).toBeTrue();
    expect(controller.hasStarted).toBeFalse();
  });

  for (const key of ['p', 'Escape']) {
    it(`pauses a running game with "${key}" and resumes it with the same key`, () => {
      controller.resume();

      controller.executeAction(key);
      expect(controller.isPaused).toBeTrue();

      controller.executeAction(key);
      expect(controller.isPaused).toBeFalse();
    });
  }

  it('knows the game has started once it has been resumed, even while paused again', () => {
    controller.resume();
    controller.pause();

    expect(controller.hasStarted).toBeTrue();
  });

  it('does not resume a finished game with the pause key', () => {
    controller.resume();
    controller.gameOver = true;
    controller.pause();

    controller.executeAction('p');

    expect(controller.isPaused).toBeTrue();
  });
});
