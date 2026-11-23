import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import {
  NEXT_PIECE_WIDTH,
  NEXT_PIECE_HEIGHT,
} from '../../../../assets/constants/tetrisConstanst';
import { TetrisControllerService } from '@app/data/services/tetris/TetrisController.service';
import { PointsService } from '@app/data/services/tetris/Points.service';
import { WelcomeTetrisModalComponent } from '@app/presentation/components/welcome-tetris-modal/welcome-tetris-modal.component';
import { ChronometerComponent } from '@app/presentation/components/chronometer/chronometer.component';
import { EndgameModalTetrisComponent } from '@app/presentation/components/endgame-modal-tetris/endgame-modal-tetris.component';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { GameBarComponent } from '@app-components/game-bar/game-bar.component';
import { type Direction, keyActions, listenDrags } from '@app-input';
import { ACTION } from '@app/data/models/tetris/MoveDirections.enum';
import { phoneLayout, TETRIS_DRAGS, TETRIS_KEYS } from '@app/data/services/tetris/tetris-controls';

@Component({
  standalone: true,
  selector: 'app-tetris',
  templateUrl: './tetris.component.html',
  styleUrl: './tetris.component.css',
  imports: [
    CommonModule,
    ChronometerComponent,
    WelcomeTetrisModalComponent,
    EndgameModalTetrisComponent,
    GameBarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // The board's shape, for the CSS that fits it to a phone's screen.
    '[style.--tetris-board-aspect]': 'controller.WIDTH / controller.HEIGHT',
  },
})
export class TetrisComponent implements OnInit, OnDestroy {
  @ViewChild('tetris', { static: true }) canvasRef!: ElementRef;
  @ViewChild('nextPiece', { static: true }) nextPieceRef!: ElementRef;
  @ViewChild('playArea', { static: true }) playAreaRef!: ElementRef<HTMLElement>;

  private board!: HTMLCanvasElement;
  private nextPiece!: HTMLCanvasElement;
  private boardContext!: CanvasRenderingContext2D;
  private nextPieceContext!: CanvasRenderingContext2D;

  protected controller = inject(TetrisControllerService);
  protected point = inject(PointsService);
  private PLATFORM = inject(PLATFORM_ID);
  private stopDrags?: () => void;

  constructor() {
    // Every key goes to the game: one with no action still settles a resting piece.
    keyActions(TETRIS_KEYS, { on: 'keydown', otherwise: null }).subscribe(({ action }) =>
      this.controller.executeAction(action)
    );
  }

  ngOnInit(): void {
    //Board
    this.board = this.canvasRef.nativeElement;
    this.boardContext = this.board.getContext('2d') as CanvasRenderingContext2D;
    const sharpness = this.boardSharpness();
    const block = this.controller.BLOCK * sharpness;
    this.board.width = block * this.controller.WIDTH;
    this.board.height = block * this.controller.HEIGHT;
    this.boardContext.scale(block, block);

    //Next Piece Board
    this.nextPiece = this.nextPieceRef.nativeElement;
    this.nextPieceContext = this.nextPiece.getContext(
      '2d'
    ) as CanvasRenderingContext2D;
    this.nextPiece.width = this.controller.PIECE_SIZE * NEXT_PIECE_WIDTH;
    this.nextPiece.height = this.controller.PIECE_SIZE * NEXT_PIECE_HEIGHT;
    this.nextPieceContext.scale(
      this.controller.PIECE_SIZE,
      this.controller.PIECE_SIZE
    );

    this.controller.updateNextPiece(
      this.nextPieceContext,
      this.nextPiece.width,
      this.nextPiece.height
    );
    this.controller.runGame(
      this.boardContext,
      this.boardWidth,
      this.boardHeight
    );

    if (isPlatformBrowser(this.PLATFORM)) this.listenToFingers();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.controller.animationFrameId);
    this.stopDrags?.();
  }

  /**
   * On a touch screen the whole play area is the pad: dragging sideways
   * moves the piece a column per cell the finger travels, dragging down
   * brings it down a row per cell, and a tap rotates it.
   */
  private listenToFingers(): void {
    this.stopDrags = listenDrags(this.playAreaRef.nativeElement, {
      // A cell as the board is drawn on screen: the piece follows the finger.
      step: () => this.board.getBoundingClientRect().width / this.controller.WIDTH,
      onStep: (direction: Direction) => {
        const action = TETRIS_DRAGS[direction];
        if (action !== null) this.controller.executeAction(action);
      },
      onTap: () => this.controller.executeAction(ACTION.ROTATE),
    });
  }

  /**
   * How many pixels the board is drawn with per pixel of its size. On a
   * phone the CSS stretches the board to fill the screen, so it is drawn
   * finer to stay sharp; elsewhere it is shown at most at its own size.
   */
  private boardSharpness(): number {
    if (!isPlatformBrowser(this.PLATFORM) || !phoneLayout(window.innerWidth)) return 1;
    return Math.min(4, Math.ceil((window.devicePixelRatio || 1) * 1.5));
  }

  /** A click on the board rotates the piece, as it goes down. Fingers tap instead. */
  protected clickToRotate(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    this.controller.executeAction(ACTION.ROTATE);
  }

  get boardWidth() {
    return this.board.width;
  }
  get boardHeight() {
    return this.board.height;
  }

  pause(): void {
    this.controller.pause();
  }
}

export default TetrisComponent;
