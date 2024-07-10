import {
  CommonModule,
  DOCUMENT,
  NgClass,
  isPlatformBrowser,
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  PLATFORM_ID,
  inject,
  input,
} from '@angular/core';
import { MoveList } from '@app/data/models/chess/chess-history-move';
import { ChessHistory } from '@app/data/services/chess/ChessHistory.service';
import { ScrollToDirective } from '@app/shared/directives/ScrollTo.directive';
import { ScrollToBottomDirective } from '@app/shared/directives/ScrollToBottom.directive';

@Component({
  standalone: true,
  imports: [CommonModule, NgClass, ScrollToDirective],
  selector: 'chess-move-list',
  templateUrl: './chess-move-list.component.html',
  styleUrl: './chess-move-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessMoveListComponent {
  public moveList = input<MoveList>([], { transform: undefined });
  public pointer = input(0);
  public historySize = input(1);
  public updateList = { val: false };
  @Output() public showPreviousPositionEvent = new EventEmitter<number>();

  public showPreviousPosition(moveIndex: number): void {
    this.showPreviousPositionEvent.emit(moveIndex);
  }

  public getCurrentMove(moveNumber: number, sum: number) {
    if (moveNumber > 10) {
      this.updateList = { ...this.updateList, val: !this.updateList };
    }
    return moveNumber * 2 + sum === this.pointer() ? 'current-move' : '';
  }
}
