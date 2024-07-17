import { AUTO, Game } from 'phaser';
import { GameScene } from '@app/data/services/retrorunner/scenes/GameScene';
import { PreloaderScene } from '@app/data/services/retrorunner/scenes/PreloaderScene';

export enum SceneKeys {
  GAME = 'Game',
  PRELOADER = 'Preloader',
  HEIGHT = 244,
  WIDTH = 256,
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
  scene: [PreloaderScene, GameScene],
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

export default StartGame;
