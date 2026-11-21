import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { GAME_STORE, memoryStore } from '@app-persistence';
import { BoardServiceService } from '@app/data/services/snakeling/BoardService.service';
import { FoodService } from '@app/data/services/snakeling/Food.service';
import { ScoreService } from '@app/data/services/snakeling/Score.service';
import { SnakeService } from '@app/data/services/snakeling/Snake.service';
import { SnakelingControllerService } from '@app/data/services/snakeling/SnakelingController.service';

import { EndgameModalSnakelingComponent } from './endgame-modal-snakeling.component';

describe('EndgameModalSnakelingComponent', () => {
  let fixture: ComponentFixture<EndgameModalSnakelingComponent>;
  let root: HTMLElement;
  let controller: SnakelingControllerService;

  const show = () => {
    fixture = TestBed.createComponent(EndgameModalSnakelingComponent);
    root = fixture.nativeElement;
    fixture.detectChanges();
  };
  const click = (label: string) => {
    Array.from(root.querySelectorAll('button'))
      .find((b) => b.textContent!.trim() === label)!
      .click();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EndgameModalSnakelingComponent],
      providers: [
        provideRouter([]),
        { provide: GAME_STORE, useValue: memoryStore() },
        SnakelingControllerService,
        BoardServiceService,
        FoodService,
        SnakeService,
        ScoreService,
      ],
    });
    controller = TestBed.inject(SnakelingControllerService);
    // reset needs the board, which this dialog does not have.
    spyOn(controller, 'reset');
  });

  it('names the mode played', () => {
    controller.start('classic');
    show();

    expect(root.querySelector('.mode')!.textContent!.trim()).toBe('Classic');
  });

  it('offers to play again, change mode, or exit', () => {
    controller.start('portal');
    show();

    const labels = Array.from(root.querySelectorAll('button')).map((b) =>
      b.textContent!.trim()
    );
    expect(labels).toEqual(['Play Again', 'Change mode', 'Exit']);
  });

  it('goes back to the menu to change mode', () => {
    controller.start('classic');
    show();

    click('Change mode');

    expect(controller.started).toBeFalse();
    expect(controller.isPaused).toBeTrue();
  });

  it('leaves for the game list from Exit', () => {
    controller.start('classic');
    show();
    const navigate = spyOn(TestBed.inject(Router), 'navigate');

    click('Exit');

    expect(navigate).toHaveBeenCalledWith(['/games']);
  });
});
