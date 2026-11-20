// main goes first, as the app loads it: it imports the scenes, and the
// scenes import its SceneKeys back.
import '../main';
import { RetroRunnerKey, RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import { WorldGenerator } from '../generation/world-generator';
import { TEST_FLOOR_Y } from '../testing/phaser-test-scene';
import { PreloaderScene } from './PreloaderScene';

/** The keys the preloader asks for, recorded without loading anything. */
function preloadedKeys(): Set<string> {
  const keys = new Set<string>();
  const loader = {
    setPath: () => loader,
    on: () => loader,
    image: (key: string) => (keys.add(key), loader),
    spritesheet: (key: string) => (keys.add(key), loader),
    audio: (key: string) => (keys.add(key), loader),
  };
  const scene = new PreloaderScene();
  (scene as unknown as { load: typeof loader }).load = loader;
  scene.preload();
  return keys;
}

/** Every picture the world placed in many runs, read from the plans. */
function picturesTheWorldPlaces(): Set<string> {
  const keys = new Set<string>([
    RetroRunnerMedia.FLOORGRASS_START,
    RetroRunnerMedia.FLOORGRASS_CENTER,
    RetroRunnerMedia.FLOORGRASS_END,
    RetroRunnerMedia.GRASS_BLOCK,
    RetroRunnerMedia.FISHING_HUT,
  ]);
  for (let i = 1; i <= 300; i++) {
    const seed = (Math.imul(i, 2654435761) >>> 0).toString(16).toUpperCase().padStart(8, '0');
    const generator = new WorldGenerator({ key: seed, floorY: TEST_FLOOR_Y });
    for (let plan = generator.next(); plan.startX < 20000; plan = generator.next()) {
      for (const piece of plan.pieces) {
        if (piece.type === 'stone' || piece.type === 'grass' || piece.type === 'deco') keys.add(piece.key);
      }
    }
  }
  return keys;
}

describe('PreloaderScene', () => {
  it('preloads every picture the world can place', () => {
    const preloaded = preloadedKeys();

    const missing = [...picturesTheWorldPlaces()].filter((key) => !preloaded.has(key));

    expect(missing).toEqual([]);
  });

  it('preloads what the scenes draw and play: the player, the coin, the sky, its layers and the sounds', () => {
    const preloaded = preloadedKeys();

    for (const key of [
      RetroRunnerKey.RUNNER,
      RetroRunnerMedia.COIN_SPRITE,
      RetroRunnerMedia.BG_ALT,
      RetroRunnerMedia.LAYER_CLOUDS,
      RetroRunnerMedia.LAYER_MOUNTAINS,
      RetroRunnerMedia.LAYER_GRASS_FAR,
      RetroRunnerMedia.LAYER_GRASS_NEAR,
      RetroRunnerMedia.BIT_JUMP,
      RetroRunnerMedia.COIN_SOUND,
      RetroRunnerMedia.GAMEOVER_SOUND,
      RetroRunnerMedia.CAPIBARA_SOUND,
    ]) {
      expect(preloaded.has(key)).withContext(key).toBeTrue();
    }
  });

  // Nothing draws these yet. Each comes back with the code that uses it.
  it('does not preload what nothing uses', () => {
    const preloaded = preloadedKeys();

    const unused = [
      RetroRunnerMedia.STAR_SPRITE,
      RetroRunnerMedia.CHEST_SPRITE,
      RetroRunnerMedia.FLAG_SPRITE,
      RetroRunnerMedia.FLAGPOLE_SPRITE,
      RetroRunnerMedia.KEY_SPRITE,
      RetroRunnerMedia.FLOORGRASS_SMALL,
      RetroRunnerMedia.NATURA_BACKGROUND,
      RetroRunnerMedia.LAYER_SKY,
      RetroRunnerMedia.LAYER_2,
      RetroRunnerMedia.LAYER_7,
      RetroRunnerMedia.LADDER_1B,
      RetroRunnerMedia.LADDER_2B,
      RetroRunnerMedia.LADDER_3B,
      RetroRunnerMedia.BOAT_2,
      RetroRunnerMedia.FISH_1,
      RetroRunnerMedia.FISH_2,
      RetroRunnerMedia.FISH_3,
      RetroRunnerMedia.FISH_4,
      RetroRunnerMedia.FISH_5,
      RetroRunnerMedia.FISH_6,
      RetroRunnerMedia.FISH_7,
      RetroRunnerMedia.FISH_8,
    ];

    expect(unused.filter((key) => preloaded.has(key))).toEqual([]);
  });
});
