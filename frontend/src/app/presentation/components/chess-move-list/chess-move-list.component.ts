import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  input,
} from '@angular/core';
import { MoveList } from '@app/data/models/chess/chess-history-move';
import { ScrollToDirective } from '@app/shared/directives/ScrollTo.directive';
import { ScrollToBottomDirective } from '@app/shared/directives/ScrollToBottom.directive';

@Component({
  standalone: true,
  selector: 'chess-move-list',
  templateUrl: './chess-move-list.component.html',
  styleUrl: './chess-move-list.component.css',
  imports: [CommonModule, ScrollToDirective, ScrollToBottomDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessMoveListComponent {
  public moveList = input.required<MoveList>();
  public pointer = input(0);
  public historySize = input(1);
  @Output() public showPreviousPositionEvent = new EventEmitter<number>();

  public showPreviousPosition(moveIndex: number): void {
    this.showPreviousPositionEvent.emit(moveIndex);
  }

  public getCurrentMove(moveNumber: number, sum: number) {
    return moveNumber * 2 + sum === this.pointer() ? 'current-move' : '';
  }
}
