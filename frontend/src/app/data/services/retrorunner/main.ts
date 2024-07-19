import { AUTO, Game } from 'phaser';
import { GameScene } from '@app/data/services/retrorunner/scenes/GameScene';
import { PreloaderScene } from '@app/data/services/retrorunner/scenes/PreloaderScene';
import GameOverScene from '@app/data/services/retrorunner/scenes/GameOverScene';

export enum SceneKeys {
  GAME = 'Game',
  PRELOADER = 'Preloader',
  GAME_OVER = 'GameOver',
  MAX_HEIGHT = 330,
  MAX_WIDTH = 500,
  SCENE_READY = 'current-scene-ready',
}

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: Math.min(window.innerWidth, SceneKeys.MAX_WIDTH),
  height: Math.min(window.innerHeight, SceneKeys.MAX_HEIGHT),
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
    mouse: true,
    touch: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PreloaderScene, GameScene, GameOverScene],
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

export default StartGame;
