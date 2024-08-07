import { Component, OnDestroy, OnInit } from '@angular/core';
import { EventBus } from '@app/data/services/phaser/EventBus';
import StartGame, { SceneKeys } from '@app/data/services/retrorunner/main';
import { Scene, Game } from 'phaser';

@Component({
  standalone: true,
  selector: 'retro-runner-phaser-game',
  template: '<div id="retro-runner-game"></div>',
})
export class RetroRunnerPhaserGameComponent implements OnInit, OnDestroy {
  public scene!: Scene;
  public game!: Game;

  public sceneCallback!: (scene: Scene) => void;

  ngOnInit() {
    this.game = StartGame('retro-runner-game');
    EventBus.on(SceneKeys.SCENE_READY, (scene: Scene) => {
      this.scene = scene;

      if (this.sceneCallback) {
        this.sceneCallback(scene);
      }
    });
  }

  ngOnDestroy() {
    if (this.game) {
      this.game.destroy(true);
    }
  }
}
