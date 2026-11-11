import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Renderer2,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { MemoramaControllerService } from '@app/data/services/memorama/memoramaController.service';
import { PixelEmblemComponent } from '@app-components/pixel-emblem/pixel-emblem.component';
import { cardArt } from '@app-pages/memorama/memorama-deck';

@Component({
  standalone: true,
  imports: [CommonModule, PixelEmblemComponent],
  selector: 'welcome-momerama-modal',
  templateUrl: './welcome-momerama-modal.component.html',
  styleUrls: [
    '../../../shared/styles/modal.css',
    './welcome-momerama-modal.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeMomeramaModalComponent {
  protected controller = inject(MemoramaControllerService);
  protected renderer = inject(Renderer2);
  private router = inject(Router);
  private playButton = viewChild.required<ElementRef<HTMLButtonElement>>('play');

  /** True when the dialog is a pause in a round that is already going. */
  readonly resuming = input(false);
  /** The card used to show what a pair looks like. */
  protected readonly SAMPLE = cardArt(3);

  constructor() {
    // Enter starts or resumes the round without reaching for the mouse.
    afterNextRender(() => this.playButton().nativeElement.focus());
  }

  protected close(): void {
    this.controller.resetGame(this.renderer);
    this.controller.pause();
    this.router.navigate(['/games']);
  }

  protected playGame(): void {
    this.controller.resume();
  }
}
