import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  viewChild,
} from '@angular/core';
import { EventBus } from '@app/data/services/phaser/EventBus';
import { SceneKeys } from '@app/data/services/retrorunner/main';
import { RetroRunnerPhaserGameComponent } from '@app/presentation/components/retro-runner-game/retro-runner-game.component';
import { Scene } from 'phaser';

@Component({
  standalone: true,
  selector: 'retro-runner',
  templateUrl: './retro-runner.component.html',
  styleUrl: './retro-runner.component.css',
  imports: [CommonModule, RetroRunnerPhaserGameComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RetroRunnerComponent implements AfterViewInit {
  public gameRef = viewChild.required(RetroRunnerPhaserGameComponent);

  ngAfterViewInit() {
    EventBus.on(SceneKeys.SCENE_READY, (scene: Scene) => {});
  }
}

export default RetroRunnerComponent;
