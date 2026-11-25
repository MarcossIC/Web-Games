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
import { formatTime } from '@app/data/services/ringout/ringout-progress';
import { RingOutController } from '@app/data/services/ringout/RingOutController.service';
import { TrapFocusDirective } from '@app/shared/directives/TrapFocus.directive';

/** A level, or a stage of Infinite, cleared: its time, the best one, and the way on. */
@Component({
  standalone: true,
  imports: [TrapFocusDirective],
  selector: 'endgame-modal-ringout',
  templateUrl: './endgame-modal-ringout.component.html',
  styleUrls: ['./endgame-modal-ringout.component.css', '../../../shared/styles/modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EndgameModalRingoutComponent {
  protected readonly controller = inject(RingOutController);
  private readonly router = inject(Router);
  private readonly first = viewChild.required<ElementRef<HTMLButtonElement>>('first');

  protected readonly result = this.controller.result;
  protected readonly time = computed(() => formatTime(this.result()?.timeMs ?? 0));
  protected readonly best = computed(() => {
    const level = this.result()?.level;
    const best = level === undefined ? null : this.controller.bestTimeHere(level);
    return best === null ? '--' : formatTime(best);
  });
  protected readonly infinite = computed(() => this.result()?.mode === 'infinite');
  /** What is cleared, as the title names it: a level, or a stage of Infinite. */
  protected readonly unit = computed(() => (this.infinite() ? 'Stage' : 'Level'));
  /** How much faster than the best before, when it was beaten. */
  protected readonly gain = computed(() => {
    const result = this.result();
    if (!result?.newBest || result.previousBest === null) return null;
    return formatTime(result.previousBest - result.timeMs);
  });
  protected readonly lastLevel = computed(() => !this.controller.hasNext());

  constructor() {
    // Enter goes on without reaching for the mouse.
    afterNextRender(() => this.first().nativeElement.focus());
  }

  protected next(): void {
    this.controller.next();
  }

  protected retry(): void {
    this.controller.retry();
  }

  protected levels(): void {
    this.controller.backToMenu();
  }

  protected close(): void {
    this.router.navigate(['/games']);
  }
}
