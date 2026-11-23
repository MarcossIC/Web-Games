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
import { keyActions } from '@app-input';
import { ACTION } from '@app/data/models/tetris/MoveDirections.enum';
import { screenButtonsOn, TETRIS_KEYS } from '@app/data/services/tetris/tetris-controls';

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
})
export class TetrisComponent implements OnInit, OnDestroy {
  @ViewChild('tetris', { static: true }) canvasRef!: ElementRef;
  @ViewChild('nextPiece', { static: true }) nextPieceRef!: ElementRef;

  private board!: HTMLCanvasElement;
  private nextPiece!: HTMLCanvasElement;
  private boardContext!: CanvasRenderingContext2D;
  private nextPieceContext!: CanvasRenderingContext2D;

  protected controller = inject(TetrisControllerService);
  protected point = inject(PointsService);
  private PLATFORM = inject(PLATFORM_ID);
  /** For the buttons under the board. */
  protected readonly ACTION = ACTION;

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
    this.board.width = this.controller.BLOCK * this.controller.WIDTH;
    this.board.height = this.controller.BLOCK * this.controller.HEIGHT;
    this.boardContext.scale(this.controller.BLOCK, this.controller.BLOCK);

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
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.controller.animationFrameId);
  }

  onPress(action: ACTION) {
    this.isMobile() && this.controller.executeAction(action);
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

  isMobile(): boolean {
    if (isPlatformBrowser(this.PLATFORM)) return screenButtonsOn(window.innerWidth);
    else return false;
  }
}

export default TetrisComponent;
