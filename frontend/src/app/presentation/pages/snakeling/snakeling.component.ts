import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  PLATFORM_ID,
  Renderer2,
  ViewChild,
  inject,
} from '@angular/core';
import { SnakelingControllerService } from '@app/data/services/snakeling/SnakelingController.service';
import { Observable, fromEvent, interval, throttleTime } from 'rxjs';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { WelcomeSnakelingModalComponent } from '@app/presentation/components/welcome-snakeling-modal/welcome-snakeling-modal.component';
import { EndgameModalSnakelingComponent } from '@app/presentation/components/endgame-modal-snakeling/endgame-modal-snakeling.component';

@Component({
  standalone: true,
  selector: 'app-snakeling',
  templateUrl: './snakeling.component.html',
  styleUrl: './snakeling.component.css',
  imports: [
    CommonModule,
    WelcomeSnakelingModalComponent,
    EndgameModalSnakelingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnakelingComponent implements OnInit {
  @ViewChild('board', { static: true }) boardRef!: ElementRef;

  private renderer = inject(Renderer2);
  protected controller = inject(SnakelingControllerService);
  private destroy = inject(DestroyRef);
  private PLATFORM = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);
  private cronometro$: Observable<number>;

  constructor() {
    this.cronometro$ = interval(180);
    if (isPlatformBrowser(this.PLATFORM)) {
      const throttleDuration = 90;
      fromEvent<KeyboardEvent>(this.document, 'keydown')
        .pipe(throttleTime(throttleDuration), takeUntilDestroyed(this.destroy))
        .subscribe((event: any) => {
          this.controller.executeAction(event.key);
        });
    }
  }

  ngOnInit(): void {
    const boardDiv = this.renderer.selectRootElement(
      this.boardRef.nativeElement
    );
    this.controller.initGame(boardDiv, this.renderer);

    this.cronometro$.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.controller.runGame();
    });
  }

  onPress(key: string) {
    this.controller.executeAction(key);
  }
}

export default SnakelingComponent;
