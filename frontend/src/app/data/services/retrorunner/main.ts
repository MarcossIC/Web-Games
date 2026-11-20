import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { GameScene } from '@app/data/services/retrorunner/scenes/GameScene';
import { PreloaderScene } from '@app/data/services/retrorunner/scenes/PreloaderScene';
import GameOverScene from '@app/data/services/retrorunner/scenes/GameOverScene';
import { PauseScene } from '@app/data/services/retrorunner/scenes/PauseScene';
import { TouchUiScene } from '@app/data/services/retrorunner/scenes/TouchUiScene';
import { WORLD_GRAVITY } from '@app/data/services/retrorunner/generation/jump-model';
import {
  LAYOUT_CHANGED,
  RUNNER_LAYOUT,
  RunnerLayout,
  runnerLayout,
  sameLayout,
} from '@app/data/services/retrorunner/utils/runner-layout';

export enum SceneKeys {
  GAME = 'Game',
  PRELOADER = 'Preloader',
  GAME_OVER = 'GameOver',
  PAUSE = 'Pause',
  TOUCH_UI = 'TouchUi',
  SCENE_READY = 'current-scene-ready',
}

/** What the page and the game ask of each other, through the EventBus. */
export enum RunnerEvents {
  TOGGLE_PAUSE = 'runner-toggle-pause',
  RESTART = 'runner-restart',
  /** The game asks the page to leave: on a phone the page's bar is hidden. */
  EXIT = 'runner-exit',
  /** The game asks the page to copy the link of this level. */
  COPY_LINK = 'runner-copy-link',
  /** The page answers how the copy went: true when the link was copied. */
  LINK_COPIED = 'runner-link-copied',
}

/** How long R has to be held to throw the run away and start a new one. */
export const RESTART_HOLD_MS = 700;

/** Registry key of the seed of the level being played. */
export const RUNNER_SEED = 'runner-seed';

// The canvas is small and enlarged: Phaser Scale.FIT stretches it with CSS to
// fill its parent. Its size is not fixed here: it comes from the layout, which
// follows the shape of the screen (see runner-layout).
// pixelArt + roundPixels ensure nearest-neighbor filtering and integer positions.
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
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
    // Phaser follows one finger unless told otherwise, and running while
    // jumping takes two. Four leaves room for a stray thumb.
    activePointers: 4,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Drawn in this order: the touch keys over the run, the screens over both.
  scene: [PreloaderScene, GameScene, TouchUiScene, GameOverScene, PauseScene],
};

/**
 * The screen is played with fingers. The page's CSS asks the same question
 * to fill the screen, so the game and the page always agree.
 */
function isTouchScreen(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/** The parent's size in CSS px, (0, 0) while it is missing or not laid out. */
function measure(parent: string): { width: number; height: number } {
  const element = typeof document === 'undefined' ? null : document.getElementById(parent);
  const rect = element?.getBoundingClientRect();
  return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
}

/**
 * Keeps the canvas in the shape of its parent. Phaser tells when the parent
 * changed size (a phone was turned, the browser hid its bars): the layout is
 * worked out again and, if it is another one, the canvas is resized and the
 * scenes are told to redraw.
 */
function followParent(game: Game): void {
  let resizing = false;
  game.scale.on(Phaser.Scale.Events.RESIZE, () => {
    // Resizing the canvas announces a resize of its own.
    if (resizing) return;
    const parent = game.scale.parentSize;
    const previous = game.registry.get(RUNNER_LAYOUT) as RunnerLayout;
    const next = runnerLayout(parent.width, parent.height, isTouchScreen());
    if (sameLayout(previous, next)) return;

    game.registry.set(RUNNER_LAYOUT, next);
    resizing = true;
    try {
      game.scale.setGameSize(next.width, next.height);
    } finally {
      resizing = false;
    }
    game.events.emit(LAYOUT_CHANGED, next, previous);
  });
}

const StartGame = (parent: string, initialSeed?: string) => {
  const { width, height } = measure(parent);
  const layout = runnerLayout(width, height, isTouchScreen());

  const game = new Game({
    ...config,
    width: layout.width,
    height: layout.height,
    parent,
    callbacks: {
      // Before any scene boots: every scene draws with the layout.
      preBoot: (booting) => {
        booting.registry.set(RUNNER_LAYOUT, layout);
        // Store seed in registry so GameScene can read it synchronously on first init
        if (initialSeed) booting.registry.set('initialSeed', initialSeed);
      },
    },
  });
  followParent(game);

  return game;
};

export default StartGame;
