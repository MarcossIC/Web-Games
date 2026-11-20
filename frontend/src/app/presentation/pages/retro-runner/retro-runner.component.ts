import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  NgZone,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventBus } from '@app/data/services/phaser/EventBus';
import { RunnerEvents, SceneKeys } from '@app/data/services/retrorunner/main';
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
  private zone = inject(NgZone);

  /** Read seed from URL query param — passed to Phaser component as @Input */
  public urlSeed = inject(ActivatedRoute).snapshot.queryParamMap.get('seed') || undefined;

  /** Seed of the level being played, as the game reports it. */
  protected readonly seed = signal<string | undefined>(this.urlSeed);
  /** What the copy button says: its name, or how the last copy went. */
  protected readonly copyLabel = signal('Copy Link');

  // The game runs outside Angular's zone, and so does what it says through
  // the EventBus: whatever touches the page or the router steps back in.

  /** Phaser emits 'seed-changed' whenever a game starts → sync to URL */
  private readonly onSeedChanged = (seed: string) =>
    this.zone.run(() => {
      this.seed.set(seed);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { seed },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });

  /**
   * The game asks to leave. On a phone the game fills the screen and the
   * bar with Exit Game is hidden: its pause menu and its game over ask here.
   */
  private readonly onExit = () => this.zone.run(() => this.router.navigate(['/games']));

  /** The pause menu of a phone asks for the link, and is told how it went. */
  private readonly onCopyLink = () =>
    this.zone.run(async () => {
      const copied = await this.copyLink();
      EventBus.emit(RunnerEvents.LINK_COPIED, copied);
    });

  ngAfterViewInit() {
    EventBus.on(SceneKeys.SCENE_READY, (_scene: Scene) => {});
    EventBus.on('seed-changed', this.onSeedChanged);
    EventBus.on(RunnerEvents.EXIT, this.onExit);
    EventBus.on(RunnerEvents.COPY_LINK, this.onCopyLink);
  }

  /** The bar's pause button: the run pauses or resumes, as with Esc or P. */
  protected togglePause(): void {
    EventBus.emit(RunnerEvents.TOGGLE_PAUSE);
  }

  /**
   * Copies the address of this exact level, seed included.
   * @returns whether the link reached the clipboard
   */
  protected async copyLink(): Promise<boolean> {
    const link = new URL(window.location.href);
    const seed = this.seed();
    if (seed) link.searchParams.set('seed', seed);
    let copied = true;
    try {
      await navigator.clipboard.writeText(link.toString());
    } catch {
      // No clipboard access (an insecure page, or permission denied). The
      // button says so instead of looking as if nothing happened; the
      // address bar holds the same link.
      copied = false;
    }
    this.copyLabel.set(copied ? 'Copied' : 'Not Copied');
    setTimeout(() => this.copyLabel.set('Copy Link'), 1800);
    return copied;
  }

  ngOnDestroy() {
    EventBus.off(SceneKeys.SCENE_READY);
    EventBus.off('seed-changed', this.onSeedChanged);
    EventBus.off(RunnerEvents.EXIT, this.onExit);
    EventBus.off(RunnerEvents.COPY_LINK, this.onCopyLink);
  }
}

export default RetroRunnerComponent;
