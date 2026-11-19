import { DecimalPipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { BreakerControllerService } from '@app/data/services/breaker/BreakerController.service';
import { formatTime } from '@app/data/services/breaker/engine/records';
import { TrapFocusDirective } from '@app/shared/directives/TrapFocus.directive';

@Component({
  standalone: true,
  imports: [DecimalPipe, TrapFocusDirective],
  selector: 'endgame-modal-breaker',
  templateUrl: './endgame-modal-breaker.component.html',
  styleUrls: [
    '../../../shared/styles/modal.css',
    './endgame-modal-breaker.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EndgameModalBreakerComponent {
  protected controller = inject(BreakerControllerService);
  private router = inject(Router);
  private playButton = viewChild.required<ElementRef<HTMLButtonElement>>('play');

  protected readonly time = computed(() => formatTime(this.controller.summary()?.timeMs ?? 0));
  protected readonly sectorBests = computed(
    () => this.controller.result()?.newSectorBests.join(', ') ?? '',
  );

  constructor() {
    // Enter starts the next run without reaching for the mouse.
    afterNextRender(() => this.playButton().nativeElement.focus());
  }

  protected close(): void {
    this.router.navigate(['/games']);
  }

  protected playAgain(): void {
    this.controller.restart();
  }
}
