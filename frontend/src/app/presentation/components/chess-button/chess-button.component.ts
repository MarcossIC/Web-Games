import { ChangeDetectionStrategy, Component, input } from '@angular/core';

type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  standalone: true,
  selector: 'chess-button',
  template: ` <button
    type="button"
    class="chess-btn"
    [disabled]="disabled()"
    [attr.aria-label]="label() || null"
    [attr.title]="label() || null"
  >
    <ng-content></ng-content>
  </button>`,
  styleUrls: ['./chess-button.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessButton {
  public type = input<ButtonType>('button');
  public disabled = input(false);
  /** What the button does, for an icon-only button. */
  public label = input('');
}
