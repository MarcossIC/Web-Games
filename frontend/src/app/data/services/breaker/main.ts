import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { BootScene } from '@app/data/services/breaker/scenes/BootScene';
import {
  BREAKER_RECORDS_SOURCE,
  type BreakerRecordsSource,
  GameScene,
} from '@app/data/services/breaker/scenes/GameScene';
import { BreakerSceneKeys } from '@app/data/services/breaker/scenes/scene-keys';

export { BreakerSceneKeys };

/** The world is designed for this size; Scale.FIT enlarges the canvas with CSS. */
export const BREAKER_WIDTH = 960;
export const BREAKER_HEIGHT = 720;

const config: Phaser.Types.Core.GameConfig = {
  // AUTO picks WebGL: the paddle is a NineSlice, which draws nothing on Canvas
  // (the scene falls back to three images there, for headless specs).
  type: AUTO,
  width: BREAKER_WIDTH,
  height: BREAKER_HEIGHT,
  backgroundColor: '#07060d',
  banner: false,
  render: {
    // Neon art scaled up by Scale.FIT: smooth filtering, not pixel art.
    antialias: true,
    powerPreference: 'high-performance',
    // Nothing reads the canvas back and the background is opaque.
    transparent: false,
    preserveDrawingBuffer: false,
  },
  // The engine runs its own fixed step; Phaser only draws, so no physics.
  input: { keyboard: true, mouse: true, touch: true, gamepad: false },
  // Sound is the scene's own WebAudio synth: Phaser's sound manager is never used.
  audio: { noAudio: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene],
};

/**
 * Starts the game inside the element with id `parent`. `records` is how the
 * scene reads the records the page's controller owns.
 */
const StartBreaker = (parent: string, records: BreakerRecordsSource): Game =>
  new Game({
    ...config,
    parent,
    // Before any scene boots: GameScene reads it in create.
    callbacks: { preBoot: (game) => game.registry.set(BREAKER_RECORDS_SOURCE, records) },
  });

export default StartBreaker;
