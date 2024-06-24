import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  Renderer2,
  ViewChild,
  inject,
} from '@angular/core';
import { SnakelingControllerService } from '@app/data/services/snakeling/SnakelingController.service';
import { Observable, fromEvent, interval, throttleTime } from 'rxjs';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
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
})
export class SnakelingComponent implements OnInit {
  @ViewChild('board', { static: true }) boardRef!: ElementRef;

  private renderer = inject(Renderer2);
  protected controller = inject(SnakelingControllerService);
  private destroy = inject(DestroyRef);
  private cronometro$: Observable<number>;

  constructor() {
    this.cronometro$ = interval(180);
  }

  ngOnInit(): void {
    const boardDiv = this.renderer.selectRootElement(
      this.boardRef.nativeElement
    );
    this.controller.initGame(boardDiv, this.renderer);

    const keyboardEvents$ = fromEvent<KeyboardEvent>(window, 'keydown');
    const throttleDuration = 90;

    keyboardEvents$
      .pipe(throttleTime(throttleDuration), takeUntilDestroyed(this.destroy))
      .subscribe((event: any) => {
        this.controller.executeAction(event.key);
      });

    this.cronometro$.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      this.controller.runGame();
    });
  }

  onPress(key: string) {
    this.controller.executeAction(key);
  }
}

export default SnakelingComponent;
