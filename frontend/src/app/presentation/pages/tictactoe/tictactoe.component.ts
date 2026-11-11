import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TicTacToeControllerService } from '@app/data/services/tictactoe/TicTacToeController.service';
import { EndgameModalTttComponent } from '@app/presentation/components/endgame-modal-ttt/endgame-modal-ttt.component';
import { SelectModalTttComponent } from '@app/presentation/components/select-modal-ttt/select-modal-ttt.component';
import { delay, filter, fromEvent } from 'rxjs';
import { GameBarComponent } from '@app-components/game-bar/game-bar.component';
import { TttMarkComponent } from '@app-components/ttt-mark/ttt-mark.component';

@Component({
  standalone: true,
  selector: 'app-tictactoe',
  templateUrl: './tictactoe.component.html',
  styleUrl: './tictactoe.component.css',
  imports: [
    GameBarComponent,
    CommonModule,
    SelectModalTttComponent,
    TttMarkComponent,
    EndgameModalTttComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TictactoeComponent {
  @ViewChild('board', { static: true }) boardRef!: ElementRef;

  protected controller = inject(TicTacToeControllerService);
  private destroy = inject(DestroyRef);
  private PLATFORM = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);

  constructor() {
    if (isPlatformBrowser(this.PLATFORM)) {
      fromEvent<KeyboardEvent>(this.document, 'keyup')
        .pipe(
          takeUntilDestroyed(this.destroy),
          filter(({ key }) => key === 'p' || key === 'Escape')
        )
        .subscribe((_) => this.controller.reset());
    }
    this.controller._notifyBot
      .pipe(delay(500), takeUntilDestroyed(this.destroy))
      .subscribe(() => this.controller.playBot());
  }

  protected get xTurn(): boolean {
    return this.controller.isPlayerXTurn();
  }

  /** Who is behind a mark: the main player, a friend or the bot. */
  protected whoPlays(mark: 'X' | 'O'): string {
    const mainPlaysIt =
      mark === 'O'
        ? this.controller.mainPlayerPlaysWithO()
        : this.controller.mainPlayerPlaysWithX();
    if (mainPlaysIt) return 'You';
    return this.controller.isBotPlaying() ? 'Bot' : 'Friend';
  }

  /** What a screen reader announces for a cell. */
  protected cellLabel(row: number, column: number, cell: string): string {
    const state = cell === 'X' || cell === 'O' ? cell : 'empty';
    return `Row ${row + 1}, column ${column + 1}: ${state}`;
  }

  protected cellSelected(row: number, cell: number): void {
    if (!this.controller.isOccupied(row, cell)) {
      this.controller.runGame(row, cell);
    }
  }
}

export default TictactoeComponent;
