import { AUTO, Game } from 'phaser';
import { GameScene } from '@app/data/services/retrorunner/scenes/GameScene';
import { PreloaderScene } from '@app/data/services/retrorunner/scenes/PreloaderScene';
import GameOverScene from '@app/data/services/retrorunner/scenes/GameOverScene';

export enum SceneKeys {
  GAME = 'Game',
  PRELOADER = 'Preloader',
  GAME_OVER = 'GameOver',
  HEIGHT = 292,
  WIDTH = 304,
  SCENE_READY = 'current-scene-ready',
}

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: SceneKeys.WIDTH,
  height: SceneKeys.HEIGHT,
  backgroundColor: '#049cd8',
  parent: 'retro-runner-game',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300, x: 0 },
      debug: false,
    },
  },
  input: {
    keyboard: true,
    mouse: false,
  },
  scene: [PreloaderScene, GameScene, GameOverScene],
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

export default StartGame;
