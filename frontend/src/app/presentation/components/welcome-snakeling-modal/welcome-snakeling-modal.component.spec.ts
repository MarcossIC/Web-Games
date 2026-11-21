import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { GAME_STORE, memoryStore } from '@app-persistence';
import { BoardServiceService } from '@app/data/services/snakeling/BoardService.service';
import { FoodService } from '@app/data/services/snakeling/Food.service';
import { ScoreService } from '@app/data/services/snakeling/Score.service';
import { SnakeService } from '@app/data/services/snakeling/Snake.service';
import { SnakelingControllerService } from '@app/data/services/snakeling/SnakelingController.service';

import { WelcomeSnakelingModalComponent } from './welcome-snakeling-modal.component';

describe('WelcomeSnakelingModalComponent', () => {
  let fixture: ComponentFixture<WelcomeSnakelingModalComponent>;
  let root: HTMLElement;
  let controller: SnakelingControllerService;

  const buttons = () =>
    Array.from(root.querySelectorAll('button')).map((b) => b.textContent!.trim());
  const click = (label: string) => {
    const button = Array.from(root.querySelectorAll('button')).find(
      (b) => b.textContent!.trim() === label
    );
    button!.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [WelcomeSnakelingModalComponent],
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
    fixture = TestBed.createComponent(WelcomeSnakelingModalComponent);
    root = fixture.nativeElement;
    fixture.detectChanges();
  });

  const title = () => root.querySelector('h2')!.textContent!.trim();
  const cards = () =>
    Array.from(root.querySelectorAll('.mode-card')).map(
      (c) => c.querySelector('.mode-name')!.textContent!.trim()
    );

  it('opens on the modes to pick from, with how to play and exit', () => {
    expect(title()).toBe('Snakeling');
    expect(cards()).toEqual(['Classic', 'Portal']);
    expect(buttons().slice(2)).toEqual(['How to play', 'Exit']);
  });

  it('starts the game in the mode picked', () => {
    const start = spyOn(controller, 'start');

    (root.querySelectorAll('.mode-card')[0] as HTMLButtonElement).click();

    expect(start).toHaveBeenCalledWith('classic');
  });

  it('shows the best score of each mode on its card', () => {
    const score = controller.scoreService;
    score.score = 24;
    score.updateMaxScore('classic');
    score.score = 96;
    score.updateMaxScore('portal');
    fixture.detectChanges();

    const best = Array.from(root.querySelectorAll('.mode-best')).map((b) =>
      b.textContent!.trim()
    );
    expect(best).toEqual(['Best 24', 'Best 96']);
  });

  it('is a pause menu while a game is going', () => {
    // A game started, then paused (reset is left out: it needs the board).
    spyOn(controller, 'reset');
    controller.start('portal');
    fixture.detectChanges();
    expect(controller.isPaused).toBeTrue();

    expect(title()).toBe('Paused');
    expect(buttons()).toEqual(['Resume', 'How to play', 'Change mode', 'Exit']);

    click('Resume');

    expect(controller.isPaused).toBeFalse();
  });

  it('explains both modes, and goes back to the menu', () => {
    click('How to play');

    expect(title()).toBe('How to play');
    const modes = Array.from(root.querySelectorAll('.mode-rule dt')).map((d) =>
      d.textContent!.trim()
    );
    expect(modes).toEqual(['Classic', 'Portal']);
    expect(buttons()).toEqual(['← Back']);

    click('← Back');

    expect(cards()).toEqual(['Classic', 'Portal']);
  });

  it('leaves for the game list from Exit', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate');

    click('Exit');

    expect(navigate).toHaveBeenCalledWith(['/games']);
  });
});
