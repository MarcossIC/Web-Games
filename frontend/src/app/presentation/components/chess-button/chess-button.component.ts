import { ChangeDetectionStrategy, Component, input } from '@angular/core';

type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  standalone: true,
  selector: 'chess-button',
  template: ` <button type="button" class="chess-btn" [disabled]="disabled()">
    <ng-content></ng-content>
  </button>`,
  styleUrls: ['./chess-button.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessButton {
  public type = input<ButtonType>('button');
  public disabled = input(false);
}
