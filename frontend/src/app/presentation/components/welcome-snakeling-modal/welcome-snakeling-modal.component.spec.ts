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

  it('opens on a menu to play, learn how, or exit', () => {
    expect(root.querySelector('h2')!.textContent!.trim()).toBe('Snakeling');
    expect(buttons()).toEqual(['Play', 'How to play', 'Exit']);
  });

  it('offers to resume when the game is paused', () => {
    fixture.componentRef.setInput('resuming', true);
    fixture.detectChanges();

    expect(root.querySelector('h2')!.textContent!.trim()).toBe('Paused');
    expect(buttons()[0]).toBe('Resume');
  });

  it('shows how to play, and goes back to the menu', () => {
    click('How to play');

    expect(root.querySelector('h2')!.textContent!.trim()).toBe('How to play');
    expect(root.querySelector('.rules')).not.toBeNull();
    expect(buttons()).toEqual(['← Back']);

    click('← Back');

    expect(buttons()).toEqual(['Play', 'How to play', 'Exit']);
  });

  it('starts the game from Play', () => {
    expect(controller.isPaused).toBeTrue();

    click('Play');

    expect(controller.isPaused).toBeFalse();
  });

  it('leaves for the game list from Exit', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate');
    spyOn(controller, 'reset');

    click('Exit');

    expect(navigate).toHaveBeenCalledWith(['/games']);
  });
});
