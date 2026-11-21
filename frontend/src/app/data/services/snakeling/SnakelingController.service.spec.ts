import { Component, Renderer2, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GAME_STORE, memoryStore } from '@app-persistence';
import { BoardSizeService } from '@app/data/services/BoardSize.service';
import { BoardServiceService } from './BoardService.service';
import { FoodService } from './Food.service';
import { ScoreService } from './Score.service';
import { SnakeService } from './Snake.service';
import {
  SnakelingControllerService,
  TIME_ATTACK_MS,
} from './SnakelingController.service';

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

  it('always starts the snake in the middle of the board', () => {
    const height = TestBed.inject(BoardSizeService).HEIGHT;
    for (const mode of ['classic', 'portal', 'time'] as const) {
      controller.start(mode);
      // Three segments, head to the right, the middle one on the center column.
      expect(snake.body.map(([x]) => x)).toEqual([
        Math.floor(width / 2) + 1,
        Math.floor(width / 2),
        Math.floor(width / 2) - 1,
      ]);
      expect(snake.snakeY).toBe(Math.ceil(height / 2));
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

  describe('Time Attack', () => {
    it('ends the game when the minute is up', () => {
      controller.start('time');
      controller.tickClock(TIME_ATTACK_MS - 1000);

      expect(controller.isGameOver).toBeFalse();
      expect(controller.timeLeftMs).toBe(1000);

      controller.tickClock(1000);

      expect(controller.isGameOver).toBeTrue();
      expect(controller.endedBy).toBe('time');
      expect(controller.timeLeftMs).toBe(0);
    });

    it('stops the clock while paused', () => {
      controller.start('time');
      controller.changePause();
      controller.tickClock(5000);

      expect(controller.timeLeftMs).toBe(TIME_ATTACK_MS);
    });

    it('gives a full minute again on a new game', () => {
      controller.start('time');
      controller.tickClock(20_000);
      controller.reset();

      expect(controller.timeLeftMs).toBe(TIME_ATTACK_MS);
    });

    it('has no clock in the other modes', () => {
      controller.start('classic');
      controller.tickClock(TIME_ATTACK_MS);

      expect(controller.isGameOver).toBeFalse();
    });

    it('goes through the edges, like Portal', () => {
      controller.start('time');
      runTo(width);
      controller.runGame();

      expect(controller.isGameOver).toBeFalse();
      expect(snake.snakeX).toBe(1);
    });
  });
});
