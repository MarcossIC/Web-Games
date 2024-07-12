import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Renderer2,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { MemoramaControllerService } from '@app/data/services/memorama/memoramaController.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'welcome-momerama-modal',
  templateUrl: './welcome-momerama-modal.component.html',
  styleUrls: [
    './welcome-momerama-modal.component.css',
    '../../../shared/styles/modal.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeMomeramaModalComponent {
  protected controller = inject(MemoramaControllerService);
  protected renderer = inject(Renderer2);
  private router = inject(Router);

  protected close(): void {
    this.controller.resetGame(this.renderer);
    this.controller.pause();
    this.router.navigate(['/games']);
  }

  protected playGame(): void {
    this.controller.resume();
  }
}
