import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { GameScene } from '@app/data/services/retrorunner/scenes/GameScene';
import { PreloaderScene } from '@app/data/services/retrorunner/scenes/PreloaderScene';
import GameOverScene from '@app/data/services/retrorunner/scenes/GameOverScene';
import { PauseScene } from '@app/data/services/retrorunner/scenes/PauseScene';
import { WORLD_GRAVITY } from '@app/data/services/retrorunner/generation/jump-model';

export enum SceneKeys {
  GAME = 'Game',
  PRELOADER = 'Preloader',
  GAME_OVER = 'GameOver',
  PAUSE = 'Pause',
  SCENE_READY = 'current-scene-ready',
}

/** What the page and the pause screen ask of the run, through the EventBus. */
export enum RunnerEvents {
  TOGGLE_PAUSE = 'runner-toggle-pause',
  RESTART = 'runner-restart',
}

/** How long R has to be held to throw the run away and start a new one. */
export const RESTART_HOLD_MS = 700;

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
      gravity: { y: WORLD_GRAVITY, x: 0 },
      debug: false,
      // One physics step per rendered frame, sized by the frame's time.
      // The default is a fixed 60 Hz step on its own clock: on any screen
      // that is not exactly 60 Hz some frames get no step and others two,
      // so the player moves in bursts while the camera keeps gliding.
      fixedStep: false,
    },
  },
  fps: {
    // Below 20 fps a frame's time is no longer trusted: the game slows
    // down instead of taking a step long enough to fall through a floor.
    min: 20,
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
  scene: [PreloaderScene, GameScene, GameOverScene, PauseScene],
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
