import { Component, Renderer2, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GAME_STORE, memoryStore } from '@app-persistence';
import { BoardSizeService } from '@app/data/services/BoardSize.service';
import { BoardServiceService } from './BoardService.service';
import { FoodService } from './Food.service';
import { ScoreService } from './Score.service';
import { SnakeService } from './Snake.service';
import { SnakelingControllerService } from './SnakelingController.service';

/** Only here to hand out a Renderer2, which comes with a component. */
@Component({ standalone: true, template: '' })
class HostForRenderer {
  readonly renderer = inject(Renderer2);
}

describe('Service: SnakelingController', () => {
  let controller: SnakelingControllerService;
  let snake: SnakeService;
  let food: FoodService;
  let width: number;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: GAME_STORE, useValue: memoryStore() },
        SnakelingControllerService,
        BoardServiceService,
        FoodService,
        SnakeService,
        ScoreService,
      ],
    });
    controller = TestBed.inject(SnakelingControllerService);
    snake = TestBed.inject(SnakeService);
    food = TestBed.inject(FoodService);
    width = TestBed.inject(BoardSizeService).WIDTH;

    // The rules keep their state on the cells of a board element.
    const fixture = TestBed.createComponent(HostForRenderer);
    controller.initGame(document.createElement('div'), fixture.componentInstance.renderer);
  });

  /** Drives the snake right, along its row, until it is at `column`. */
  const runTo = (column: number) => {
    // Keep the apple out of the way, so the snake does not grow.
    food.foodX = 1;
    food.foodY = snake.snakeY === 1 ? 2 : 1;
    while (snake.snakeX !== column && !controller.isGameOver) controller.runGame();
  };

  it('waits on the menu until a mode is picked', () => {
    controller.changePause();

    expect(controller.isPaused).toBeTrue();
    expect(controller.started).toBeFalse();
  });

  it('starts a game in the mode picked', () => {
    controller.start('classic');

    expect(controller.mode).toBe('classic');
    expect(controller.started).toBeTrue();
    expect(controller.isPaused).toBeFalse();
  });

  it('starts the snake away from the edges', () => {
    for (let i = 0; i < 50; i++) {
      controller.start('classic');
      for (const [x] of snake.body) {
        expect(x).toBeGreaterThan(1);
        expect(x).toBeLessThan(width);
      }
    }
  });

  it('ends a Classic game when the snake runs into a wall', () => {
    controller.start('classic');
    runTo(width);

    expect(controller.isGameOver).toBeFalse();

    controller.runGame();

    expect(controller.isGameOver).toBeTrue();
    expect(controller.endedBy).toBe('wall');
    // It stops against the wall, still on the board.
    expect(snake.snakeX).toBe(width);
  });

  it('takes the snake through the edge in Portal', () => {
    controller.start('portal');
    runTo(width);
    controller.runGame();

    expect(controller.isGameOver).toBeFalse();
    expect(snake.snakeX).toBe(1);
  });

  it('goes back to the menu from a finished game', () => {
    controller.start('classic');
    controller.isGameOver = true;

    controller.backToMenu();

    expect(controller.started).toBeFalse();
    expect(controller.isPaused).toBeTrue();
    expect(controller.isGameOver).toBeFalse();
  });
});
