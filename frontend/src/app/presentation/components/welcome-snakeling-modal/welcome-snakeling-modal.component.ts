import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { SnakelingMode } from '@app/data/models/snakeling/Mode';
import { SNAKELING_MODES } from 'assets/constants/snakeling';
import { POINTS_PER_APPLE } from '@app/data/services/snakeling/Score.service';
import { SnakelingControllerService } from '@app/data/services/snakeling/SnakelingController.service';
import { TrapFocusDirective } from '@app/shared/directives/TrapFocus.directive';

/** What the dialog shows: the menu, or the page that explains the game. */
export type SnakelingMenuView = 'menu' | 'help';

/**
 * The menu of the game. On opening it offers the modes; during a game it
 * is the pause menu. Both lead to a page that explains how to play.
 */
@Component({
  standalone: true,
  imports: [CommonModule, TrapFocusDirective],
  selector: 'welcome-snakeling-modal',
  templateUrl: './welcome-snakeling-modal.component.html',
  styleUrls: [
    './welcome-snakeling-modal.component.css',
    '../../../shared/styles/modal.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeSnakelingModalComponent {
  protected controller: SnakelingControllerService = inject(
    SnakelingControllerService
  );
  private router = inject(Router);
  private injector = inject(Injector);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly modes = SNAKELING_MODES;
  protected readonly pointsPerApple = POINTS_PER_APPLE;
  protected readonly view = signal<SnakelingMenuView>('menu');
  /** The mode of the game that is paused. */
  protected readonly current = computed(
    () =>
      SNAKELING_MODES.find((mode) => mode.id === this.controller.mode) ??
      SNAKELING_MODES[0]
  );

  constructor() {
    // Enter starts the first mode, or resumes, without reaching for the mouse.
    afterNextRender(() => this.focusFirst());
  }

  protected showHelp(): void {
    this.switchTo('help');
  }

  protected showMenu(): void {
    this.switchTo('menu');
  }

  private switchTo(view: SnakelingMenuView): void {
    this.view.set(view);
    this.focusAfterRender();
  }

  /** The buttons are new elements once the view changes: focus them then. */
  private focusAfterRender(): void {
    afterNextRender(() => this.focusFirst(), { injector: this.injector });
  }

  /** Each view marks the button to start from with `data-autofocus`. */
  private focusFirst(): void {
    this.host.nativeElement
      .querySelector<HTMLElement>('[data-autofocus]')
      ?.focus();
  }

  protected play(mode: SnakelingMode): void {
    this.controller.start(mode);
  }

  protected resume(): void {
    this.controller.changePause();
  }

  protected changeMode(): void {
    this.controller.backToMenu();
    this.focusAfterRender();
  }

  protected close(): void {
    this.router.navigate(['/games']);
  }
}
