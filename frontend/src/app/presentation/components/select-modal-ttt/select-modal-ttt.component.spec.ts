import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BoardStateService } from '@app/data/services/tictactoe/BoardStateService.service';
import { GameStateService } from '@app/data/services/tictactoe/GameState.service';
import { SecondPlayerService } from '@app/data/services/tictactoe/SecondPlayer.service';
import { TicTacToeControllerService } from '@app/data/services/tictactoe/TicTacToeController.service';
import { UserPlayerService } from '@app/data/services/tictactoe/UserPlayer.service';
import { SelectModalTttComponent } from './select-modal-ttt.component';

describe('SelectModalTttComponent', () => {
  let fixture: ComponentFixture<SelectModalTttComponent>;
  let dialog: HTMLElement;
  let controller: TicTacToeControllerService;

  beforeEach(async () => {
    // The same providers the Tic Tac Toe route declares in app.routing.ts.
    await TestBed.configureTestingModule({
      imports: [SelectModalTttComponent],
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
    fixture = TestBed.createComponent(SelectModalTttComponent);
    fixture.detectChanges();
    dialog = fixture.nativeElement;
  });

  /** Picks the option of a group whose visible text is `label`. */
  const choose = (label: string) => {
    // A mark tile also holds its big decorative glyph, so match on the end.
    const option = Array.from(dialog.querySelectorAll('label')).find(
      (candidate) =>
        (candidate.textContent ?? '').replace(/\s+/g, ' ').trim().endsWith(label)
    );
    const input = option?.querySelector('input');
    if (!input) throw new Error(`No option labelled "${label}"`);
    input.click();
    fixture.detectChanges();
  };
  const levels = () =>
    dialog.querySelector<HTMLFieldSetElement>('fieldset.level-options');

  it('starts as Player X against a friend, with the bot level out of reach', () => {
    expect(controller.mainPlayerPlaysWithX()).toBeTrue();
    expect(controller.isBotPlaying()).toBeFalse();
    expect(levels()?.disabled).toBeTrue();
  });

  it('lets the player choose O and go back to X', () => {
    choose('Player O');
    expect(controller.mainPlayerPlaysWithO()).toBeTrue();

    choose('Player X');
    expect(controller.mainPlayerPlaysWithX()).toBeTrue();
  });

  it('turns the bot on with "Bot" and off again with "Friend"', () => {
    choose('Bot');
    expect(controller.isBotPlaying()).toBeTrue();
    expect(levels()?.disabled).toBeFalse();

    choose('Friend');
    expect(controller.isBotPlaying()).toBeFalse();
    expect(levels()?.disabled).toBeTrue();
  });

  it('sets the level of the bot', () => {
    choose('Bot');

    choose('Master');
    expect(controller.botIsMaster()).toBeTrue();

    choose('Normal');
    expect(controller.botIsNovice()).toBeTrue();

    choose('Rookie');
    expect(controller.botIsRockie()).toBeTrue();
  });
});
