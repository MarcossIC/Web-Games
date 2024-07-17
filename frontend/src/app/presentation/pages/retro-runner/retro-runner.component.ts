import {
  CommonModule,
  DOCUMENT,
  isPlatformBrowser,
  NgClass,
} from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  PLATFORM_ID,
  signal,
  viewChild,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EventBus } from '@app/data/services/phaser/EventBus';
import { SceneKeys } from '@app/data/services/retrorunner/main';
import { GameScene } from '@app/data/services/retrorunner/scenes/GameScene';
import { RetroRunnerPhaserGameComponent } from '@app/presentation/components/retro-runner-game/retro-runner-game.component';
import Phaser from 'phaser';
import { filter, fromEvent } from 'rxjs';

@Component({
  standalone: true,
  selector: 'retro-runner',
  templateUrl: './retro-runner.component.html',
  styleUrl: './retro-runner.component.css',
  imports: [CommonModule, NgClass, RetroRunnerPhaserGameComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RetroRunnerComponent implements AfterViewInit {
  public canMoveSprite = signal(false);
  private destroy$ = inject(DestroyRef);
  private PLATFORM = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);
  gameRef = viewChild.required(RetroRunnerPhaserGameComponent);

  ngAfterViewInit() {
    EventBus.on(SceneKeys.SCENE_READY, (scene: Phaser.Scene) => {
      this.canMoveSprite.set(scene.scene.key !== SceneKeys.GAME);
    });

    if (isPlatformBrowser(this.PLATFORM)) {
      fromEvent<KeyboardEvent>(this.document, 'keydown')
        .pipe(
          takeUntilDestroyed(this.destroy$),
          filter(
            ({ key }) =>
              key === 'ArrowLeft' ||
              key === 'ArrowRight' ||
              key === 'ArrowUp' ||
              key === 'Space' ||
              key === 'a' ||
              key === 'w' ||
              key === 'd'
          )
        )
        .subscribe(({ key }) => {
          this.moveSprite(key);
        });
      fromEvent<KeyboardEvent>(this.document, 'keyup')
        .pipe(
          takeUntilDestroyed(this.destroy$),
          filter(
            ({ key }) =>
              key === 'ArrowLeft' ||
              key === 'ArrowRight' ||
              key === 'ArrowUp' ||
              key === 'Space' ||
              key === 'a' ||
              key === 'w' ||
              key === 'd'
          )
        )
        .subscribe(({ key }) => {
          this.moveSprite('stop');
        });
    }
  }

  public moveSprite(key: string) {
    const ref = this.gameRef();
    if (!ref || !ref.scene) return;

    const game = ref.scene as GameScene;
    //game.movePlayer(key);
  }
}

export default RetroRunnerComponent;
