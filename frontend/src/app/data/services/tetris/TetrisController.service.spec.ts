import { TestBed } from '@angular/core/testing';
import { bindKeys } from '@app-input';
import { ACTION } from '@app/data/models/tetris/MoveDirections.enum';
import { TETRIS_KEYS } from './tetris-controls';
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

  /** A key press, read through the game's bindings as the page does. */
  const press = (key: string) => controller.executeAction(bindKeys(TETRIS_KEYS, { otherwise: null })({ key }) ?? null);

  it('starts paused and has not started yet', () => {
    expect(controller.isPaused).toBeTrue();
    expect(controller.hasStarted).toBeFalse();
  });

  for (const key of ['p', 'Escape']) {
    it(`pauses a running game with "${key}" and resumes it with the same key`, () => {
      controller.resume();

      press(key);
      expect(controller.isPaused).toBeTrue();

      press(key);
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

    press('p');

    expect(controller.isPaused).toBeTrue();
  });

  it('settles a resting piece on any key, even one with no action', () => {
    const board = TestBed.inject(BoardService);
    spyOn(board, 'detectedACollision').and.returnValue(true);
    const settle = spyOn<any>(controller, 'checkCollisionEffects');
    controller.resume();

    controller.executeAction(null);

    expect(settle).toHaveBeenCalled();
  });

  it('does nothing with a key while paused', () => {
    const settle = spyOn<any>(controller, 'checkCollisionEffects');

    controller.executeAction(ACTION.LEFT);

    expect(settle).not.toHaveBeenCalled();
  });
});
