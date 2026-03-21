import { AUTO, Game } from 'phaser';
import { GameScene } from '@app/data/services/retrorunner/scenes/GameScene';
import { PreloaderScene } from '@app/data/services/retrorunner/scenes/PreloaderScene';
import GameOverScene from '@app/data/services/retrorunner/scenes/GameOverScene';

export enum SceneKeys {
  GAME = 'Game',
  PRELOADER = 'Preloader',
  GAME_OVER = 'GameOver',
  SCENE_READY = 'current-scene-ready',
}

// Internal resolution — all game logic is designed for this size.
// Phaser Scale.FIT stretches the canvas via CSS to fill the container.
// pixelArt + roundPixels ensure nearest-neighbor filtering and integer positions.
const GAME_WIDTH = 550;
const GAME_HEIGHT = 330;

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  roundPixels: true,
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

const StartGame = (parent: string, initialSeed?: string) => {
  const game = new Game({ ...config, parent });

  // Store seed in registry so GameScene can read it synchronously on first init
  if (initialSeed) {
    game.registry.set('initialSeed', initialSeed);
  }

  return game;
};

export default StartGame;
