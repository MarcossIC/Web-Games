import { Component, Input, NgZone, OnDestroy, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { EventBus } from '@app/data/services/phaser/EventBus';
import StartGame, { SceneKeys } from '@app/data/services/retrorunner/main';
import { Scene, Game } from 'phaser';

@Component({
  standalone: true,
  selector: 'retro-runner-phaser-game',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: '<div id="retro-runner-game"></div>',
})
export class RetroRunnerPhaserGameComponent implements OnInit, OnDestroy {
  private ngZone = inject(NgZone);
  public scene!: Scene;
  public game!: Game;

  /** Seed from URL query param — passed by parent before game starts */
  @Input() initialSeed?: string;

  public sceneCallback!: (scene: Scene) => void;

  ngOnInit() {
    // Phaser's loop ticks every frame and hears every finger on the screen:
    // outside the zone, so none of that triggers a change detection. What
    // the game asks of the page comes through the EventBus, and the page
    // steps back into the zone for it.
    this.ngZone.runOutsideAngular(() => {
      this.game = StartGame('retro-runner-game', this.initialSeed);
    });
    EventBus.on(SceneKeys.SCENE_READY, (scene: Scene) => {
      this.scene = scene;

      if (this.sceneCallback) {
        this.sceneCallback(scene);
      }
    });
  }

  ngOnDestroy() {
    EventBus.off(SceneKeys.SCENE_READY);

    if (this.game) {
      this.game.destroy(true);
    }
  }
}
