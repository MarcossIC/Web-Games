import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BoardStateService } from '@app/data/services/tictactoe/BoardStateService.service';
import { GameStateService } from '@app/data/services/tictactoe/GameState.service';
import { SecondPlayerService } from '@app/data/services/tictactoe/SecondPlayer.service';
import { TicTacToeControllerService } from '@app/data/services/tictactoe/TicTacToeController.service';
import { UserPlayerService } from '@app/data/services/tictactoe/UserPlayer.service';
import { TictactoeComponent } from './tictactoe.component';

describe('TictactoeComponent', () => {
  let fixture: ComponentFixture<TictactoeComponent>;
  let page: HTMLElement;
  let controller: TicTacToeControllerService;

  beforeEach(async () => {
    // The same providers the Tic Tac Toe route declares in app.routing.ts.
    await TestBed.configureTestingModule({
      imports: [TictactoeComponent],
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
    fixture = TestBed.createComponent(TictactoeComponent);
    fixture.detectChanges();
    page = fixture.nativeElement;
  });

  const cells = () =>
    Array.from(page.querySelectorAll<HTMLButtonElement>('.board .cell'));
  const fighter = (mark: 'x' | 'o') =>
    page.querySelector<HTMLElement>(`.fighter-${mark}`);
  /** Accepts the New Game dialog as it opens: two humans on one screen. */
  const startGame = () => {
    page.querySelector<HTMLButtonElement>('.play-button')?.click();
    fixture.detectChanges();
  };

  it('shows an empty three by three board', () => {
    expect(cells().length).toBe(9);
    expect(cells().every((cell) => cell.classList.contains('is-free'))).toBeTrue();
  });

  it('places the mark of the player in turn on the cell that is clicked', () => {
    startGame();
    const first = controller.isPlayerXTurn() ? 'cell-X' : 'cell-O';

    cells()[4].click();
    fixture.detectChanges();

    expect(cells()[4].classList).toContain(first);
    expect(cells()[4].classList).not.toContain('is-free');
  });

  it('lights up the side of the player in turn, and switches after a move', () => {
    startGame();
    const xStarts = controller.isPlayerXTurn();

    expect(fighter('x')?.classList.contains('is-active')).toBe(xStarts);
    expect(fighter('o')?.classList.contains('is-active')).toBe(!xStarts);

    cells()[0].click();
    fixture.detectChanges();

    expect(fighter('x')?.classList.contains('is-active')).toBe(!xStarts);
    expect(fighter('o')?.classList.contains('is-active')).toBe(xStarts);
  });

  it('does not change a cell that is already taken', () => {
    startGame();
    cells()[0].click();
    fixture.detectChanges();
    const taken = cells()[0].className;

    cells()[0].click();
    fixture.detectChanges();

    expect(cells()[0].className).toBe(taken);
  });
});
