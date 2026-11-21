import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  OnInit,
  PLATFORM_ID,
  Renderer2,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { SnakelingControllerService } from '@app/data/services/snakeling/SnakelingController.service';
import { fromEvent, interval, throttleTime } from 'rxjs';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { WelcomeSnakelingModalComponent } from '@app/presentation/components/welcome-snakeling-modal/welcome-snakeling-modal.component';
import { EndgameModalSnakelingComponent } from '@app/presentation/components/endgame-modal-snakeling/endgame-modal-snakeling.component';
import { GameBarComponent } from '@app-components/game-bar/game-bar.component';
import { BoardSizeService } from '@app/data/services/BoardSize.service';
import { FoodService } from '@app/data/services/snakeling/Food.service';
import { SnakeService } from '@app/data/services/snakeling/Snake.service';
import { Board, Cell, interpolateBody, settleBody } from './snake-motion';
import { SnakelingCanvas } from './snakeling-canvas';
import { Turn, TurnQueue, headingTurn, swipeTurn } from './steering';
import { ACTIONS, SNAKE_FRAME_PX, SNAKE_FRAME_PX_MOBILE } from 'assets/constants/snakeling';
import { ACTION } from '@app/data/models/snakeling/Actions';
import { hasWalls, isTimed } from '@app/data/models/snakeling/Mode';

/** Time between two steps of the game. */
const STEP_MS = 180;
/** Above this the extra pixels cost a lot and are barely visible. */
const MAX_PIXEL_RATIO = 2;
const MIN_CELL_PX = 8;
/** Time Attack: below this many seconds left, the clock turns urgent. */
const HURRY_SECONDS = 10;
/** The width at which the stylesheet switches to the phone layout. */
const PHONE_QUERY = '(max-width: 600px)';

/** The key that steers each way, whichever key was pressed for it. */
const TURN_KEYS: Partial<Record<ACTION, Turn>> = {
  [ACTION.UP]: 'w',
  [ACTION.LEFT]: 'a',
  [ACTION.DOWN]: 's',
  [ACTION.RIGHT]: 'd',
};

@Component({
  standalone: true,
  selector: 'app-snakeling',
  templateUrl: './snakeling.component.html',
  styleUrl: './snakeling.component.css',
  imports: [
    CommonModule,
    GameBarComponent,
    WelcomeSnakelingModalComponent,
    EndgameModalSnakelingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnakelingComponent implements OnInit {
  private readonly play = viewChild.required<ElementRef<HTMLElement>>('play');
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly screen =
    viewChild.required<ElementRef<HTMLCanvasElement>>('screen');

  private renderer = inject(Renderer2);
  protected controller = inject(SnakelingControllerService);
  private snake = inject(SnakeService);
  private food = inject(FoodService);
  private boardSize = inject(BoardSizeService);
  private host: ElementRef<HTMLElement> = inject(ElementRef);
  private zone = inject(NgZone);
  private destroy = inject(DestroyRef);
  private PLATFORM = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);

  /** Number of segments of the snake, for the readout. */
  protected readonly length = signal(0);

  // The last two bodies the game produced. Each frame is drawn somewhere
  // between them, which is what makes the snake glide.
  private previous: Cell[] = [];
  private current: Cell[] = [];
  private steppedAt = 0;
  /** Set once the canvas exists (in the browser, after the first render). */
  private painter?: SnakelingCanvas;
  /** Turns asked for that the next steps will make, one per step. */
  private readonly turns = new TurnQueue();

  constructor() {
    if (isPlatformBrowser(this.PLATFORM)) {
      const throttleDuration = 90;
      fromEvent<KeyboardEvent>(this.document, 'keydown')
        .pipe(throttleTime(throttleDuration), takeUntilDestroyed(this.destroy))
        .subscribe((event: KeyboardEvent) => this.onPress(event.key));
    }
    // The drawing loop runs outside Angular: a frame changes pixels only,
    // so there is nothing for change detection to do 60 times a second.
    // Swipes too: a finger moving fires many events, and only a turn
    // matters, which the next step picks up.
    afterNextRender(() =>
      this.zone.runOutsideAngular(() => {
        this.draw();
        this.listenToSwipes();
      })
    );
  }

  ngOnInit(): void {
    // The snakeling services keep their state by toggling classes on the
    // cells of a board element (and detect collisions while doing so).
    // The screen is now a canvas, so they get a board that is never added
    // to the page: the rules keep working untouched and nothing is laid
    // out or painted for it.
    const logicBoard: HTMLDivElement = this.renderer.createElement('div');
    this.controller.initGame(logicBoard, this.renderer);
    this.readBody(true);

    interval(STEP_MS)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => this.step());
  }

  private step(): void {
    const running = !this.controller.isPaused && !this.controller.isGameOver;
    if (running) {
      // Each step is STEP_MS of game time: off a Time Attack clock, the
      // combo and the golden apple.
      this.controller.tick(STEP_MS);
      const turn = this.turns.take();
      if (turn) this.controller.executeAction(turn);
    } else {
      this.turns.clear();
    }
    this.controller.runGame();
    // While stopped nothing moves, but a restart may have placed the snake
    // somewhere else: reading it without motion shows that at once.
    this.readBody(!running);

    // The snake just ate: celebrate it where the head is, with the
    // points the game gave for it.
    const bite = this.controller.lastBite;
    if (running && bite) {
      this.painter?.bite(
        this.current[0],
        `+${bite.points}`,
        this.steppedAt,
        bite.golden
      );
    }
  }

  /**
   * Copies the body out of the game.
   * @param still true to show it where it is, with no motion towards it
   */
  private readBody(still: boolean): void {
    const body = settleBody(
      this.snake.body.map(([x, y]) => ({ x, y })),
      { columns: this.boardSize.WIDTH, rows: this.boardSize.HEIGHT }
    );
    this.previous = still ? body : this.current;
    this.current = body;
    this.steppedAt = performance.now();
    this.length.set(body.length);
  }

  private draw(): void {
    const painter = new SnakelingCanvas(this.screen().nativeElement);
    this.painter = painter;
    const stage = this.stage().nativeElement;
    const board: Board = {
      columns: this.boardSize.WIDTH,
      rows: this.boardSize.HEIGHT,
    };
    const { columns, rows } = board;

    // The board is as large as the space allows, in whole pixels per cell
    // so the checkered field stays crisp.
    const phone = window.matchMedia(PHONE_QUERY);
    const fit = () => {
      const room = stage.getBoundingClientRect();
      // Frame, outline and shadow the stylesheet draws around the screen.
      const frame = phone.matches ? SNAKE_FRAME_PX_MOBILE : SNAKE_FRAME_PX;
      const cell = Math.max(
        MIN_CELL_PX,
        Math.floor(
          Math.min(
            (room.width - frame) / columns,
            (room.height - frame) / rows
          )
        )
      );
      painter.resize(
        board,
        cell,
        Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO)
      );
      // The readouts above line up with the edges of the screen.
      this.host.nativeElement.style.setProperty(
        '--board-width',
        `${columns * cell}px`
      );
    };
    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(stage);
    fit();

    let frame = 0;
    const paint = (now: number) => {
      painter.draw({
        segments: interpolateBody(
          this.previous,
          this.current,
          (now - this.steppedAt) / STEP_MS,
          board
        ),
        heading: { x: this.snake.speedSnakeX, y: this.snake.speedSnakeY },
        food: { x: this.food.foodX, y: this.food.foodY },
        golden: this.food.golden
          ? { at: this.food.golden, leftMs: this.food.goldenLeftMs }
          : null,
        dead: this.controller.isGameOver,
        walls: hasWalls(this.controller.mode),
        time: now,
      });
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);

    this.destroy.onDestroy(() => {
      this.painter = undefined;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    });
  }

  /**
   * Steers the snake with a finger: a swipe turns it the way the finger
   * went. The finger does not have to lift between turns: once a turn is
   * taken, the swipe starts again from there, so one stroke can draw a
   * whole path (right, then down, then left...).
   */
  private listenToSwipes(): void {
    const area = this.play().nativeElement;
    let from: { x: number; y: number; id: number } | null = null;

    const down = (event: PointerEvent) => {
      // A mouse is steered with the keyboard; clicks stay clicks.
      if (event.pointerType === 'mouse') return;
      from = { x: event.clientX, y: event.clientY, id: event.pointerId };
    };
    const move = (event: PointerEvent) => {
      if (!from || event.pointerId !== from.id) return;
      const turn = swipeTurn(event.clientX - from.x, event.clientY - from.y);
      if (!turn) return;
      this.steer(turn);
      from = { x: event.clientX, y: event.clientY, id: from.id };
    };
    const up = (event: PointerEvent) => {
      if (from && event.pointerId === from.id) from = null;
    };

    area.addEventListener('pointerdown', down);
    area.addEventListener('pointermove', move);
    area.addEventListener('pointerup', up);
    area.addEventListener('pointercancel', up);
    this.destroy.onDestroy(() => {
      area.removeEventListener('pointerdown', down);
      area.removeEventListener('pointermove', move);
      area.removeEventListener('pointerup', up);
      area.removeEventListener('pointercancel', up);
    });
  }

  /** Keeps a turn for the next step, while the game is running. */
  private steer(turn: Turn): void {
    if (this.controller.isPaused || this.controller.isGameOver) return;
    this.turns.push(
      turn,
      headingTurn(this.snake.speedSnakeX, this.snake.speedSnakeY)
    );
  }

  /** The combo multiplier, as the readout shows it: x1.0, x1.2 ... x10. */
  protected multiplier(): string {
    const value = this.controller.scoreService.multiplier();
    return `x${value >= 10 ? value : value.toFixed(1)}`;
  }

  /** Whether the game is played against the clock. */
  protected timed(): boolean {
    return isTimed(this.controller.mode) && this.controller.started;
  }

  /** The time left, as m:ss. */
  protected clock(): string {
    const seconds = Math.ceil(this.controller.timeLeftMs / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  /** The last seconds of a Time Attack game. */
  protected hurry(): boolean {
    const seconds = Math.ceil(this.controller.timeLeftMs / 1000);
    return seconds <= HURRY_SECONDS && !this.controller.isGameOver;
  }

  onPress(key: string) {
    const turn = TURN_KEYS[ACTIONS[key]];
    if (turn) this.steer(turn);
    else this.controller.executeAction(key);
  }
}

export default SnakelingComponent;
