import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { formatTime } from '@app/data/services/ringout/ringout-progress';
import { RingOutController } from '@app/data/services/ringout/RingOutController.service';
import { TrapFocusDirective } from '@app/shared/directives/TrapFocus.directive';

/** What the dialog shows: the levels (or the pause menu), or how to play. */
export type RingOutMenuView = 'menu' | 'help';

/**
 * The menu of Ring Out. On opening it shows the levels, the ones not yet
 * reached locked; during a level it is the pause menu. Both lead to a page
 * that explains the game.
 */
@Component({
  standalone: true,
  imports: [TrapFocusDirective],
  selector: 'welcome-ringout-modal',
  templateUrl: './welcome-ringout-modal.component.html',
  styleUrls: ['./welcome-ringout-modal.component.css', '../../../shared/styles/modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeRingoutModalComponent {
  protected readonly controller = inject(RingOutController);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly view = signal<RingOutMenuView>('menu');
  protected readonly numbers = this.controller.levels.map((_, i) => i + 1);

  constructor() {
    // Enter plays the next level, or resumes, without reaching for the mouse.
    afterNextRender(() => this.focusFirst());
  }

  protected time(level: number): string {
    const best = this.controller.bestTimeOf(level);
    return best === null ? '' : formatTime(best);
  }

  protected label(level: number): string {
    if (!this.controller.isUnlocked(level)) return `Level ${level}, locked`;
    const best = this.controller.bestTimeOf(level);
    return best === null ? `Level ${level}` : `Level ${level}, best time ${formatTime(best)}`;
  }

  protected play(level: number): void {
    this.controller.start(level);
  }

  protected resume(): void {
    this.controller.resume();
  }

  protected retry(): void {
    this.controller.retry();
  }

  protected levels(): void {
    this.controller.backToMenu();
    this.focusAfterRender();
  }

  protected showHelp(): void {
    this.switchTo('help');
  }

  protected showMenu(): void {
    this.switchTo('menu');
  }

  protected close(): void {
    this.router.navigate(['/games']);
  }

  private switchTo(view: RingOutMenuView): void {
    this.view.set(view);
    this.focusAfterRender();
  }

  /** The buttons are new elements once the view changes: focus them then. */
  private focusAfterRender(): void {
    afterNextRender(() => this.focusFirst(), { injector: this.injector });
  }

  /** Each view marks the button to start from with `data-autofocus`. */
  private focusFirst(): void {
    this.host.nativeElement.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }
}
