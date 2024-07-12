import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import { ParticlesComponent } from '@app/presentation/components/particles/particles.component';
import { WelcomeTetrisModalComponent } from '@app/presentation/components/welcome-tetris-modal/welcome-tetris-modal.component';
import { ChronometerComponent } from '@app/presentation/components/chronometer/chronometer.component';
import { EndgameModalTetrisComponent } from '@app/presentation/components/endgame-modal-tetris/endgame-modal-tetris.component';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
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
  private PLATFORM = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);

  constructor() {
    if (isPlatformBrowser(this.PLATFORM)) {
      fromEvent<KeyboardEvent>(this.document, 'keydown')
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe((event: any) => this.controller.executeAction(event.key));
    }
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
    if (isPlatformBrowser(this.PLATFORM)) return window.innerWidth <= 500;
    else return false;
  }
}

export default TetrisComponent;
