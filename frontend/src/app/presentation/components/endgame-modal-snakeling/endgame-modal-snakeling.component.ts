import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { SnakelingControllerService } from '@app/data/services/snakeling/SnakelingController.service';
import { TrapFocusDirective } from '@app/shared/directives/TrapFocus.directive';
import { SNAKELING_MODES } from 'assets/constants/snakeling';

@Component({
  standalone: true,
  imports: [CommonModule, TrapFocusDirective],
  selector: 'endgame-modal-snakeling',
  templateUrl: './endgame-modal-snakeling.component.html',
  styleUrls: [
    './endgame-modal-snakeling.component.css',
    '../../../shared/styles/modal.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EndgameModalSnakelingComponent {
  protected controller = inject(SnakelingControllerService);
  private router = inject(Router);
  private playButton = viewChild.required<ElementRef<HTMLButtonElement>>('play');

  protected readonly modeName = computed(
    () =>
      SNAKELING_MODES.find((mode) => mode.id === this.controller.mode)?.name ??
      ''
  );

  constructor() {
    // Enter starts the next game without reaching for the mouse.
    afterNextRender(() => this.playButton().nativeElement.focus());
  }

  protected close(): void {
    this.controller.reset();
    this.router.navigate(['/games']);
  }

  /** Another game in the same mode. */
  protected playAgain(): void {
    this.controller.reset();
  }

  /** Back to the menu, to pick a mode. */
  protected changeMode(): void {
    this.controller.backToMenu();
  }
}
