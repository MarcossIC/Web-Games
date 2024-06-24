import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TicTacToeControllerService } from '@app/data/services/tictactoe/TicTacToeController.service';
import { DisplayInfoComponent } from '@app/presentation/components/display-info/display-info.component';
import { EndgameModalTttComponent } from '@app/presentation/components/endgame-modal-ttt/endgame-modal-ttt.component';
import { ParticlesComponent } from '@app/presentation/components/particles/particles.component';
import { SelectModalTttComponent } from '@app/presentation/components/select-modal-ttt/select-modal-ttt.component';
import { delay } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-tictactoe',
  templateUrl: './tictactoe.component.html',
  styleUrl: './tictactoe.component.css',
  imports: [
    CommonModule,
    ParticlesComponent,
    SelectModalTttComponent,
    DisplayInfoComponent,
    EndgameModalTttComponent,
  ],
})
export class TictactoeComponent {
  @ViewChild('board', { static: true }) boardRef!: ElementRef;

  protected controller = inject(TicTacToeControllerService);
  private destroy = inject(DestroyRef);

  constructor() {
    this.controller._notifyBot
      .pipe(delay(500), takeUntilDestroyed(this.destroy))
      .subscribe(() => this.controller.playBot());
  }

  protected cellSelected(row: number, cell: number): void {
    if (!this.controller.isOccupied(row, cell)) {
      setTimeout(() => {
        this.controller.runGame(row, cell);
      }, 120);
    }
  }
}

export default TictactoeComponent;
