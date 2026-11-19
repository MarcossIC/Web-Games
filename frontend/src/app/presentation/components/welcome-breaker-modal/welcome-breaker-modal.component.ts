import { DecimalPipe } from '@angular/common';
import {
  afterNextRender,
  Injector,
  signal,
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
  imports: [TrapFocusDirective, DecimalPipe],
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

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);

  /** Portrait touch screens: the help is a page of the pause screen, not always there. */
  protected readonly helpOpen = signal(false);

  constructor() {
    // Enter starts or resumes without reaching for the mouse.
    afterNextRender(() => this.focusFirst());
  }

  protected openHelp(): void {
    this.helpOpen.set(true);
    afterNextRender(() => this.focusFirst(), { injector: this.injector });
  }

  protected closeHelp(): void {
    this.helpOpen.set(false);
    afterNextRender(() => this.focusFirst(), { injector: this.injector });
  }

  /** The first button the person can actually see: the CSS decides which set is shown. */
  private focusFirst(): void {
    const root = this.host.nativeElement;
    const candidates = root.querySelectorAll<HTMLButtonElement>(
      '.menu-resume, .help-back, .play-button',
    );
    const visible = Array.from(candidates).find((b) => b.getClientRects().length > 0);
    (visible ?? this.playButton().nativeElement).focus();
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
