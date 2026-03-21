import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  inject,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventBus } from '@app/data/services/phaser/EventBus';
import { SceneKeys } from '@app/data/services/retrorunner/main';
import { RetroRunnerPhaserGameComponent } from '@app/presentation/components/retro-runner-game/retro-runner-game.component';
import { Scene } from 'phaser';

@Component({
  standalone: true,
  selector: 'retro-runner',
  templateUrl: './retro-runner.component.html',
  styleUrl: './retro-runner.component.css',
  imports: [CommonModule, RetroRunnerPhaserGameComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RetroRunnerComponent implements AfterViewInit, OnDestroy {
  public gameRef = viewChild.required(RetroRunnerPhaserGameComponent);

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  /** Read seed from URL query param — passed to Phaser component as @Input */
  public urlSeed = inject(ActivatedRoute).snapshot.queryParamMap.get('seed') || undefined;


  ngAfterViewInit() {
    EventBus.on(SceneKeys.SCENE_READY, (_scene: Scene) => {});

    // Phaser emits 'seed-changed' whenever a game starts → sync to URL
    EventBus.on('seed-changed', (seed: string) => {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { seed },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  ngOnDestroy() {
    EventBus.off(SceneKeys.SCENE_READY);
    EventBus.off('seed-changed');
  }
}

export default RetroRunnerComponent;
