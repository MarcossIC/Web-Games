import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { SnakelingControllerService } from '@app/data/services/snakeling/SnakelingController.service';
import { TrapFocusDirective } from '@app/shared/directives/TrapFocus.directive';

/** What the dialog shows: the menu, or the page that explains the game. */
export type SnakelingMenuView = 'menu' | 'help';

/**
 * The menu shown when the game opens and while it is paused:
 * play (or resume), learn how to play, or leave.
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
  /** The first button of the view on show: Play, or Back. */
  private firstButton = viewChild<ElementRef<HTMLButtonElement>>('first');

  /** True when the dialog is a pause in a game that is already going. */
  readonly resuming = input(false);

  protected readonly view = signal<SnakelingMenuView>('menu');

  constructor() {
    // Enter starts or resumes the game without reaching for the mouse.
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
    // The view's buttons are new elements: move the focus onto them.
    afterNextRender(() => this.focusFirst(), { injector: this.injector });
  }

  private focusFirst(): void {
    this.firstButton()?.nativeElement.focus();
  }

  protected close(): void {
    this.controller.reset();
    this.controller.changePause();
    this.router.navigate(['/games']);
  }

  protected playGame(): void {
    this.controller.executeAction('p');
  }
}
