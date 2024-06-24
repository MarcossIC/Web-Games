import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  Renderer2,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MemoramaControllerService } from '@app/data/services/memorama/memoramaController.service';
import { SeoService } from '@app/data/services/seo.service';
import { fillArray } from '@app/data/services/util.service';
import { ChronometerComponent } from '@app/presentation/components/chronometer/chronometer.component';
import { EndgameModalMemoramaComponent } from '@app/presentation/components/endgame-modal-memorama/endgame-modal-memorama.component';
import { ParticlesComponent } from '@app/presentation/components/particles/particles.component';
import { WelcomeMomeramaModalComponent } from '@app/presentation/components/welcome-momerama-modal/welcome-momerama-modal.component';
import { TOTAL_CARDS } from 'assets/constants/memorama';
import { Subscription, interval } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-memorama',
  templateUrl: './memorama.component.html',
  styleUrl: './memorama.component.css',
  imports: [
    CommonModule,
    ParticlesComponent,
    ChronometerComponent,
    EndgameModalMemoramaComponent,
    WelcomeMomeramaModalComponent,
  ],
})
export class MemoramaComponent implements OnInit, AfterViewInit {
  protected renderer = inject(Renderer2);
  protected controller = inject(MemoramaControllerService);
  private destroy = inject(DestroyRef);
  public cards: number[] = [];

  constructor() {}

  ngAfterViewInit(): void {
    const gameCards = document.querySelectorAll('#game-memorama .game-card');
    gameCards.forEach((card: any) => {
      const content = card.querySelector('.content') as HTMLElement;
      this.controller.cards.push({ card, content });
    });
  }

  ngOnInit(): void {
    this.controller.valueUsed = [];
    this.cards = fillArray(TOTAL_CARDS, 0);
    this.cards.forEach(() => this.controller.ramdomValues());
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(() => this.controller.verifyTime());
  }
}

export default MemoramaComponent;
