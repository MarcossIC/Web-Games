import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { SnakelingControllerService } from '@app/data/services/snakeling/SnakelingController.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'welcome-snakeling-modal',
  templateUrl: './welcome-snakeling-modal.component.html',
  styleUrls: [
    './welcome-snakeling-modal.component.css',
    '../../../shared/styles/modal.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeSnakelingModalComponent {
  protected controller: SnakelingControllerService = inject(
    SnakelingControllerService
  );
  private router = inject(Router);
  private playButton = viewChild.required<ElementRef<HTMLButtonElement>>('play');

  /** True when the dialog is a pause in a game that is already going. */
  readonly resuming = input(false);

  constructor() {
    // Enter starts or resumes the game without reaching for the mouse.
    afterNextRender(() => this.playButton().nativeElement.focus());
  }

  protected close(): void {
    this.controller.reset();
    this.controller.changePause();
    this.router.navigate(['/games']);
  }

  protected playGame(): void {
    this.controller.executeAction('p');
  }
}
