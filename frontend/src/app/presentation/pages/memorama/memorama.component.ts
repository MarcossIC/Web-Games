import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  Renderer2,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MemoramaControllerService } from '@app/data/services/memorama/memoramaController.service';
import { fillArray } from '@app/data/services/util.service';
import { ChronometerComponent } from '@app/presentation/components/chronometer/chronometer.component';
import { EndgameModalMemoramaComponent } from '@app/presentation/components/endgame-modal-memorama/endgame-modal-memorama.component';
import { WelcomeMomeramaModalComponent } from '@app/presentation/components/welcome-momerama-modal/welcome-momerama-modal.component';
import { TOTAL_CARDS } from 'assets/constants/memorama';
import { filter, fromEvent, interval } from 'rxjs';
import { GameBarComponent } from '@app-components/game-bar/game-bar.component';
import { PixelEmblemComponent } from '@app-components/pixel-emblem/pixel-emblem.component';
import { CardArt, cardArt } from './memorama-deck';

/** How long two cards that are not a pair stay up: the game turns them
 * back after this long, so the shake lasts the same. */
const MISS_MS = 450;

@Component({
  standalone: true,
  selector: 'app-memorama',
  templateUrl: './memorama.component.html',
  styleUrl: './memorama.component.css',
  imports: [
    GameBarComponent,
    PixelEmblemComponent,
    CommonModule,
    ChronometerComponent,
    EndgameModalMemoramaComponent,
    WelcomeMomeramaModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoramaComponent implements AfterViewInit {
  protected renderer = inject(Renderer2);
  protected controller = inject(MemoramaControllerService);
  private destroy$ = inject(DestroyRef);
  private platform = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);
  public cards: number[] = [];
  protected readonly pairs = TOTAL_CARDS / 2;

  // What the screen shows about the cards. The game itself only turns
  // them over; which ones are a found pair or a miss is worked out here
  // from what the game does on each pick.
  /** Positions of the cards in pairs already found. */
  protected readonly matched = signal<ReadonlySet<number>>(new Set());
  /** Positions of the two cards just picked that are not a pair. */
  protected readonly missed = signal<ReadonlySet<number>>(new Set());
  /** False until the first Play: tells the opening dialog from a pause. */
  protected readonly started = signal(false);
  /** Counts rounds, so the time bar starts again on each one. */
  protected readonly round = signal(0);
  private firstPick = -1;
  private wasOver = false;

  constructor() {
    this.controller.valueUsed = [];
    this.cards = fillArray(TOTAL_CARDS, 0);
    this.cards.forEach(() => this.controller.ramdomValues());
    effect(
      () => {
        if (!this.controller.isPaused) this.started.set(true);

        // A round that was over and no longer is: a new round began.
        const over = this.controller.isGameOver;
        if (this.wasOver && !over) {
          this.matched.set(new Set());
          this.missed.set(new Set());
          this.round.update((round) => round + 1);
        }
        this.wasOver = over;
      },
      { allowSignalWrites: true }
    );
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroy$))
      .subscribe(() => this.controller.verifyTime());
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platform)) {
      fromEvent<KeyboardEvent>(this.document, 'keyup')
        .pipe(
          takeUntilDestroyed(this.destroy$),
          filter(({ key }) => key === 'p' || key === 'Escape')
        )
        .subscribe((_) => this.controller.pause());

      const gameCards = document.querySelectorAll('#game-memorama .game-card');
      gameCards.forEach((card: any) => {
        const content = card.querySelector('.content') as HTMLElement;
        this.controller.cards.push({ card, content });
      });
    }
  }

  protected art(index: number): CardArt {
    return cardArt(this.controller.valueUsed[index]);
  }

  /** What a screen reader announces for a card. */
  protected label(index: number): string {
    const state = this.matched().has(index)
      ? `${this.art(index).name}, found`
      : 'face down';
    return `Card ${index + 1}: ${state}`;
  }

  /**
   * Passes the pick to the game, then reads what it did with it:
   * - it now holds one card: that was a first pick;
   * - it held one and now holds none: the two were a pair;
   * - it held one and now holds two: they were not, and it will turn
   *   them back shortly.
   */
  protected pick(event: Event, index: number): void {
    const held = this.controller.selectedCards.length;
    this.controller.play(this.renderer, event);
    const holds = this.controller.selectedCards.length;

    if (held === 0 && holds === 1) {
      this.firstPick = index;
    } else if (held === 1 && holds === 0) {
      this.matched.update((found) => new Set([...found, this.firstPick, index]));
    } else if (held === 1 && holds === 2) {
      this.missed.set(new Set([this.firstPick, index]));
      setTimeout(() => this.missed.set(new Set()), MISS_MS);
    }
  }
}

export default MemoramaComponent;
