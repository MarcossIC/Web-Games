import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { TicTacToeControllerService } from '@app/data/services/tictactoe/TicTacToeController.service';
import { TttMarkComponent } from '@app-components/ttt-mark/ttt-mark.component';

@Component({
  standalone: true,
  imports: [CommonModule, TttMarkComponent],
  selector: 'endgame-modal-ttt',
  templateUrl: './endgame-modal-ttt.component.html',
  styleUrls: [
    '../../../shared/styles/modal.css',
    './endgame-modal-ttt.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EndgameModalTttComponent implements OnInit {
  protected controller = inject(TicTacToeControllerService);
  private router = inject(Router);

  private playButton = viewChild.required<ElementRef<HTMLButtonElement>>('play');

  constructor() {
    // Enter starts the next round without reaching for the mouse.
    afterNextRender(() => this.playButton().nativeElement.focus());
  }

  ngOnInit() {}

  protected close(): void {
    this.controller.reset();
    this.router.navigate(['/games']);
  }

  protected playAgain(): void {
    this.controller.playAgain();
  }
}
