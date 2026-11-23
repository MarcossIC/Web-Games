import { TestBed } from '@angular/core/testing';
import { GameStatus } from '@app/data/models/tictactoe/GameStatus.enum';
import { BoardStateService } from './BoardStateService.service';
import { GameStateService } from './GameState.service';

describe('Service: GameState', () => {
  let service: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      // GameStateService asks BoardStateService whether a line is complete.
      providers: [GameStateService, BoardStateService],
    });
    service = TestBed.inject(GameStateService);
  });

  /** Marks the cells in order, X first, as [row, column] pairs. */
  function play(...cells: [number, number][]): void {
    for (const [row, column] of cells) {
      service.updateBoard(row, column);
      service.advanceTurn();
    }
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('is not over while there is no line and cells are left', () => {
    play([0, 0], [1, 1]);
    expect(service.isEndGame()).toBe(false);
  });

  it('ends with the winner when a line is completed', () => {
    play([0, 0], [1, 0], [0, 1], [1, 1], [0, 2]);
    expect(service.isEndGame()).toBe(true);
    expect(service.gameStatus).toBe(GameStatus.X_WON);
  });

  it('ends in a draw when the board fills with no line', () => {
    // X O X / X O O / O X X
    play([0, 0], [0, 1], [0, 2], [1, 1], [1, 0], [1, 2], [2, 1], [2, 0], [2, 2]);
    expect(service.isEndGame()).toBe(true);
    expect(service.gameStatus).toBe(GameStatus.DRAW);
  });
});
