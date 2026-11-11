import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventBus } from '@app/data/services/phaser/EventBus';
import { SceneKeys } from '@app/data/services/retrorunner/main';
import { RetroRunnerPhaserGameComponent } from '@app/presentation/components/retro-runner-game/retro-runner-game.component';
import { Scene } from 'phaser';
import { GameBarComponent } from '@app-components/game-bar/game-bar.component';

@Component({
  standalone: true,
  selector: 'retro-runner',
  templateUrl: './retro-runner.component.html',
  styleUrl: './retro-runner.component.css',
  imports: [CommonModule, RetroRunnerPhaserGameComponent, GameBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RetroRunnerComponent implements AfterViewInit, OnDestroy {
  public gameRef = viewChild.required(RetroRunnerPhaserGameComponent);

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  /** Read seed from URL query param — passed to Phaser component as @Input */
  public urlSeed = inject(ActivatedRoute).snapshot.queryParamMap.get('seed') || undefined;

  /** Seed of the level being played, as the game reports it. */
  protected readonly seed = signal<string | undefined>(this.urlSeed);
  /** What the copy button says: its name, or how the last copy went. */
  protected readonly copyLabel = signal('Copy Link');


  ngAfterViewInit() {
    EventBus.on(SceneKeys.SCENE_READY, (_scene: Scene) => {});

    // Phaser emits 'seed-changed' whenever a game starts → sync to URL
    EventBus.on('seed-changed', (seed: string) => {
      this.seed.set(seed);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { seed },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  /** Copies the address of this exact level, seed included. */
  protected async copyLink(): Promise<void> {
    const link = new URL(window.location.href);
    const seed = this.seed();
    if (seed) link.searchParams.set('seed', seed);
    let outcome = 'Copied';
    try {
      await navigator.clipboard.writeText(link.toString());
    } catch {
      // No clipboard access (an insecure page, or permission denied). The
      // button says so instead of looking as if nothing happened; the
      // address bar holds the same link.
      outcome = 'Not Copied';
    }
    this.copyLabel.set(outcome);
    setTimeout(() => this.copyLabel.set('Copy Link'), 1800);
  }

  ngOnDestroy() {
    EventBus.off(SceneKeys.SCENE_READY);
    EventBus.off('seed-changed');
  }
}

export default RetroRunnerComponent;
