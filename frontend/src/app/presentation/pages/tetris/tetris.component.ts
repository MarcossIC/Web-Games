import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import {
  NEXT_PIECE_WIDTH,
  NEXT_PIECE_HEIGHT,
  NEXT_PIECE_SIZE,
  BLOCK_SIZE_SCREEN,
  BOARD_WIDTH_SCREEN,
  BOARD_HEIGHT_SCREEN,
} from '../../../../assets/constants/tetrisConstanst';
import { TetrisControllerService } from '@app/data/services/tetris/TetrisController.service';
import { PointsService } from '@app/data/services/tetris/Points.service';
import { ParticlesComponent } from '@app/presentation/components/particles/particles.component';
import { WelcomeTetrisModalComponent } from '@app/presentation/components/welcome-tetris-modal/welcome-tetris-modal.component';
import { ChronometerComponent } from '@app/presentation/components/chronometer/chronometer.component';
import { EndgameModalTetrisComponent } from '@app/presentation/components/endgame-modal-tetris/endgame-modal-tetris.component';
import { CommonModule } from '@angular/common';
import { fromEvent } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  standalone: true,
  selector: 'app-tetris',
  templateUrl: './tetris.component.html',
  styleUrl: './tetris.component.css',
  imports: [
    CommonModule,
    ParticlesComponent,
    ChronometerComponent,
    WelcomeTetrisModalComponent,
    EndgameModalTetrisComponent,
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
  private destroy = inject(DestroyRef);

  constructor() {}

  ngOnInit(): void {
    //Board
    this.board = this.canvasRef.nativeElement;
    this.boardContext = this.board.getContext('2d') as CanvasRenderingContext2D;
    this.board.width = BLOCK_SIZE_SCREEN * BOARD_WIDTH_SCREEN;
    this.board.height = BLOCK_SIZE_SCREEN * BOARD_HEIGHT_SCREEN;
    this.boardContext.scale(BLOCK_SIZE_SCREEN, BLOCK_SIZE_SCREEN);

    //Next Piece Board
    this.nextPiece = this.nextPieceRef.nativeElement;
    this.nextPieceContext = this.nextPiece.getContext(
      '2d'
    ) as CanvasRenderingContext2D;
    this.nextPiece.width = NEXT_PIECE_SIZE * NEXT_PIECE_WIDTH;
    this.nextPiece.height = NEXT_PIECE_SIZE * NEXT_PIECE_HEIGHT;
    this.nextPieceContext.scale(NEXT_PIECE_SIZE, NEXT_PIECE_SIZE);

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

    const keyboardEvents$ = fromEvent<KeyboardEvent>(window, 'keydown');
    keyboardEvents$
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe((event: any) => this.controller.executeAction(event.key));
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.controller.animationFrameId);
  }

  onPress(key: string) {
    this.isMobile() && this.controller.executeAction(key);
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
    return window.innerWidth <= 500;
  }
}

export default TetrisComponent;
