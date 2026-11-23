import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BoardStateService } from '@app/data/services/tictactoe/BoardStateService.service';
import { GameStateService } from '@app/data/services/tictactoe/GameState.service';
import { SecondPlayerService } from '@app/data/services/tictactoe/SecondPlayer.service';
import { TicTacToeControllerService } from '@app/data/services/tictactoe/TicTacToeController.service';
import { UserPlayerService } from '@app/data/services/tictactoe/UserPlayer.service';
import { EndgameModalTttComponent } from './endgame-modal-ttt.component';

describe('EndgameModalTttComponent', () => {
  let fixture: ComponentFixture<EndgameModalTttComponent>;
  let dialog: HTMLElement;
  let controller: TicTacToeControllerService;

  beforeEach(async () => {
    // The same providers the Tic Tac Toe route declares in app.routing.ts.
    await TestBed.configureTestingModule({
      imports: [EndgameModalTttComponent],
      providers: [
        provideRouter([]),
        TicTacToeControllerService,
        BoardStateService,
        GameStateService,
        SecondPlayerService,
        UserPlayerService,
      ],
    }).compileComponents();

    controller = TestBed.inject(TicTacToeControllerService);
  });

  /** Two friends play the cells in order, X first, then the dialog opens. */
  function finish(...cells: [number, number][]): void {
    controller.initGame();
    for (const [row, column] of cells) controller.runGame(row, column);
    fixture = TestBed.createComponent(EndgameModalTttComponent);
    fixture.detectChanges();
    dialog = fixture.nativeElement;
  }

  const result = () => dialog.querySelector('.winner')?.textContent?.trim();

  it('names X as the winner and counts the round', () => {
    finish([0, 0], [1, 0], [0, 1], [1, 1], [0, 2]);

    expect(result()).toBe("X's Player's Won");
    expect(dialog.querySelector('.side.is-winner')?.textContent).toContain('1');
  });

  it('names O as the winner', () => {
    finish([0, 0], [1, 0], [0, 1], [1, 1], [2, 2], [1, 2]);

    expect(result()).toBe("O's Player's Won");
  });

  it('announces a draw', () => {
    // X O X / X O O / O X X
    finish([0, 0], [0, 1], [0, 2], [1, 1], [1, 0], [1, 2], [2, 1], [2, 0], [2, 2]);

    expect(result()).toBe('Draw');
    expect(dialog.querySelector('.side.is-winner')).toBeNull();
  });

  it('"Play Game" clears the board and keeps the score', () => {
    finish([0, 0], [1, 0], [0, 1], [1, 1], [0, 2]);

    dialog.querySelector<HTMLButtonElement>('.play-button')!.click();

    expect(controller.partyIsBegging()).toBe(true);
    expect(controller.retrieveBoard().flat().every((cell) => cell === '0')).toBe(true);
    expect(controller.scorePlayerX).toBe(1);
  });
});
