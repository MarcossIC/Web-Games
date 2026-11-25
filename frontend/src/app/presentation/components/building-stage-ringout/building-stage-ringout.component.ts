import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { RingOutController } from '@app/data/services/ringout/RingOutController.service';
import { TrapFocusDirective } from '@app/shared/directives/TrapFocus.directive';

/**
 * A stage of Infinite whose board is still being built and proven
 * clearable. It only shows if that takes a moment: a board ready at once
 * goes straight to the table.
 */
@Component({
  standalone: true,
  imports: [TrapFocusDirective],
  selector: 'ringout-building-stage',
  templateUrl: './building-stage-ringout.component.html',
  styleUrls: ['./building-stage-ringout.component.css', '../../../shared/styles/modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuildingStageComponent {
  protected readonly controller = inject(RingOutController);
  private readonly back = viewChild.required<ElementRef<HTMLButtonElement>>('back');

  constructor() {
    afterNextRender(() => this.back().nativeElement.focus());
  }

  protected leave(): void {
    this.controller.backToMenu();
  }
}
