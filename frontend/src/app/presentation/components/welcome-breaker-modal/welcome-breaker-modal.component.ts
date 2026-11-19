import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  BREAKER_POWER_UP_INFO,
  BREAKER_POWER_UP_ORDER,
} from '@app/data/models/breaker/BreakerPowerUpInfo';
import { PIXEL_GLYPHS, glyphCells } from '@app/data/services/breaker/assets/pixel-glyphs';
import { BreakerControllerService } from '@app/data/services/breaker/BreakerController.service';
import { TrapFocusDirective } from '@app/shared/directives/TrapFocus.directive';

@Component({
  standalone: true,
  imports: [TrapFocusDirective],
  selector: 'welcome-breaker-modal',
  templateUrl: './welcome-breaker-modal.component.html',
  styleUrls: [
    '../../../shared/styles/modal.css',
    './welcome-breaker-modal.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeBreakerModalComponent {
  protected controller = inject(BreakerControllerService);
  private router = inject(Router);
  private playButton = viewChild.required<ElementRef<HTMLButtonElement>>('play');

  protected readonly powerUps = BREAKER_POWER_UP_ORDER.map((kind) => ({
    kind,
    ...BREAKER_POWER_UP_INFO[kind],
    cells: glyphCells(PIXEL_GLYPHS[kind]),
  }));

  constructor() {
    // Enter starts or resumes without reaching for the mouse.
    afterNextRender(() => this.playButton().nativeElement.focus());
  }

  protected close(): void {
    this.router.navigate(['/games']);
  }

  protected playGame(): void {
    this.controller.play();
  }

  protected restartGame(): void {
    this.controller.restart();
  }
}
