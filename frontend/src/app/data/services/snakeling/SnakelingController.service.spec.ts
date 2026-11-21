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
import {
  GOLDEN_APPLE_LIFE_MS,
  GOLDEN_APPLE_POINTS,
  POINTS_PER_APPLE,
  comboWindowMs,
} from './scoring';

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
      controller.tick(TIME_ATTACK_MS - 1000);

      expect(controller.isGameOver).toBeFalse();
      expect(controller.timeLeftMs).toBe(1000);

      controller.tick(1000);

      expect(controller.isGameOver).toBeTrue();
      expect(controller.endedBy).toBe('time');
      expect(controller.timeLeftMs).toBe(0);
    });

    it('stops the clock while paused', () => {
      controller.start('time');
      controller.changePause();
      controller.tick(5000);

      expect(controller.timeLeftMs).toBe(TIME_ATTACK_MS);
    });

    it('gives a full minute again on a new game', () => {
      controller.start('time');
      controller.tick(20_000);
      controller.reset();

      expect(controller.timeLeftMs).toBe(TIME_ATTACK_MS);
    });

    it('has no clock in the other modes', () => {
      controller.start('classic');
      controller.tick(TIME_ATTACK_MS);

      expect(controller.isGameOver).toBeFalse();
    });

    it('ends the game at a wall, like Classic', () => {
      controller.start('time');
      runTo(width);
      controller.runGame();

      expect(controller.isGameOver).toBeTrue();
      expect(controller.endedBy).toBe('wall');
      expect(snake.snakeX).toBe(width);
    });
  });

  /** Puts the apple on the cell right ahead of the head. */
  const appleAhead = () => {
    food.foodX = snake.snakeX + snake.speedSnakeX;
    food.foodY = snake.snakeY + snake.speedSnakeY;
  };

  describe('Combo', () => {
    beforeEach(() => {
      controller.start('portal');
      // No golden apple gets in the way of these.
      controller.random = () => 0.99;
    });

    it('multiplies the points of apples eaten in a row', () => {
      appleAhead();
      controller.runGame();
      expect(controller.scoreService.score).toBe(POINTS_PER_APPLE);
      expect(controller.lastBite?.points).toBe(POINTS_PER_APPLE);

      appleAhead();
      controller.runGame();
      // The second in a row is worth x1.2: 8 * 1.2 = 9.6, so 10.
      expect(controller.scoreService.combo).toBe(2);
      expect(controller.lastBite?.points).toBe(10);
      expect(controller.scoreService.score).toBe(18);
    });

    it('ends when the time for the next apple runs out', () => {
      appleAhead();
      controller.runGame();
      controller.tick(comboWindowMs(1));

      expect(controller.scoreService.combo).toBe(0);

      appleAhead();
      controller.runGame();
      expect(controller.lastBite?.points).toBe(POINTS_PER_APPLE);
      expect(controller.scoreService.combo).toBe(1);
    });

    it('stops its time while paused', () => {
      appleAhead();
      controller.runGame();
      controller.changePause();
      controller.tick(comboWindowMs(1));

      expect(controller.scoreService.combo).toBe(1);
    });

    it('starts over on a new game', () => {
      appleAhead();
      controller.runGame();
      controller.reset();

      expect(controller.scoreService.combo).toBe(0);
      expect(controller.scoreService.apples).toBe(0);
    });
  });

  describe('Golden apple', () => {
    beforeEach(() => controller.start('portal'));

    /** Rolls the dice so that the apple brings its golden apple now. */
    const bringGolden = () => {
      controller.random = () => 0;
      controller.tick(180);
      controller.random = () => 0.99;
    };

    it('shows up by luck, at most once for each apple', () => {
      controller.random = () => 0.99;
      controller.tick(180);
      expect(food.golden).toBeNull();

      bringGolden();
      expect(food.golden).not.toBeNull();

      // It goes when its time is up...
      controller.tick(GOLDEN_APPLE_LIFE_MS);
      expect(food.golden).toBeNull();

      // ...and the same apple does not bring another one.
      controller.random = () => 0;
      controller.tick(180);
      expect(food.golden).toBeNull();

      // Eating the apple lets the next one bring its own.
      appleAhead();
      controller.runGame();
      controller.tick(180);
      expect(food.golden).not.toBeNull();
    });

    it('never shows up on the snake, the apple, or right ahead of the head', () => {
      for (let i = 0; i < 50; i++) {
        food.resetGolden();
        // The first roll brings the golden apple, the second places it.
        const rolls = [0, i / 50];
        controller.random = () => rolls.shift() ?? 0;
        controller.tick(180);
        const golden = food.golden!;
        expect(snake.verifyCollision(golden.x, golden.y)).toBeFalse();
        expect(golden.x === food.foodX && golden.y === food.foodY).toBeFalse();
        expect(
          golden.x === snake.snakeX + 1 && golden.y === snake.snakeY
        ).toBeFalse();
      }
    });

    it('gives its points without growing the snake or touching the combo', () => {
      bringGolden();
      food.golden = { x: snake.snakeX + 1, y: snake.snakeY };
      // The apple elsewhere, so only the golden one is eaten.
      food.foodX = snake.snakeX;
      food.foodY = snake.snakeY === 1 ? 2 : 1;
      const length = snake.body.length;

      controller.runGame();

      expect(controller.scoreService.score).toBe(GOLDEN_APPLE_POINTS);
      expect(snake.body.length).toBe(length);
      expect(controller.scoreService.combo).toBe(0);
      expect(food.golden).toBeNull();
      expect(controller.lastBite).toEqual({
        at: { x: snake.snakeX, y: snake.snakeY },
        points: GOLDEN_APPLE_POINTS,
        golden: true,
      });
    });

    it('is gone on a new game', () => {
      bringGolden();
      controller.reset();

      expect(food.golden).toBeNull();
      expect(food.goldenSpent).toBeFalse();
    });
  });
});
