import { Component, EventEmitter, input, Output } from '@angular/core';

type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  standalone: true,
  imports: [],
  selector: 'chess-button',
  template: ` <button type="button" class="chess-btn" [disabled]="disabled()">
    <ng-content></ng-content>
  </button>`,
  styleUrls: ['./chess-button.component.css'],
})
export class ChessButton {
  public type = input<ButtonType>('button');
  public disabled = input(false);
}
