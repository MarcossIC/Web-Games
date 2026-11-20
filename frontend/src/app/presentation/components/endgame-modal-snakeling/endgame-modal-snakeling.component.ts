import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { SnakelingControllerService } from '@app/data/services/snakeling/SnakelingController.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'endgame-modal-snakeling',
  templateUrl: './endgame-modal-snakeling.component.html',
  styleUrls: [
    './endgame-modal-snakeling.component.css',
    '../../../shared/styles/modal.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EndgameModalSnakelingComponent {
  protected controller = inject(SnakelingControllerService);
  private router = inject(Router);
  private playButton = viewChild.required<ElementRef<HTMLButtonElement>>('play');

  constructor() {
    // Enter starts the next game without reaching for the mouse.
    afterNextRender(() => this.playButton().nativeElement.focus());
  }

  protected close(): void {
    this.controller.reset();
    this.router.navigate(['/games']);
  }

  protected playAgain(): void {
    this.controller.reset();
  }
}
