import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Output,
  PLATFORM_ID,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { MoveList } from '@app/data/models/chess/chess-history-move';

@Component({
  standalone: true,
  selector: 'chess-move-list',
  templateUrl: './chess-move-list.component.html',
  styleUrl: './chess-move-list.component.css',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessMoveListComponent implements AfterViewChecked {
  private platformId = inject(PLATFORM_ID);
  private list = viewChild.required<ElementRef<HTMLElement>>('list');
  public moveList = input.required<MoveList>();
  public pointer = input(0);
  public historySize = input(1);
  @Output() public showPreviousPositionEvent = new EventEmitter<number>();
  private shownKey = '';

  public showPreviousPosition(moveIndex: number): void {
    this.showPreviousPositionEvent.emit(moveIndex);
  }

  public getCurrentMove(moveNumber: number, sum: number) {
    return moveNumber * 2 + sum === this.pointer() ? 'current-move' : '';
  }

  /** Keeps the move on the board in sight, down the list or along the strip. */
  ngAfterViewChecked(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const key = `${this.pointer()}:${this.moveList().length}:${
      this.moveList().at(-1)?.length ?? 0
    }`;
    if (key === this.shownKey) return;
    this.shownKey = key;

    const list = this.list().nativeElement;
    const current = list.querySelector<HTMLElement>('.current-move');
    if (!current) {
      list.scrollTo({ left: 0, top: 0 });
      return;
    }
    list.scrollTo({
      left: current.offsetLeft - (list.clientWidth - current.offsetWidth) / 2,
      top: current.offsetTop - (list.clientHeight - current.offsetHeight) / 2,
      behavior: 'smooth',
    });
  }
}
