import { PLAYER_GRAVITY, WORLD_GRAVITY } from '../generation/jump-model';
import { SceneKeys } from '../main';
import { startTestScene, TestScene } from '../testing/phaser-test-scene';
import { GameScene } from './GameScene';

describe('GameScene', () => {
  let harness: TestScene;
  let game: GameScene;

  beforeAll(async () => {
    harness = await startTestScene();
    harness.scene.scene.add(SceneKeys.GAME, GameScene, true, { seed: 'A1B2C3D4' });
    game = harness.scene.scene.get(SceneKeys.GAME) as GameScene;
    // As in the real game (main.ts): one step per frame, as long as the frame.
    game.physics.world.fixedStep = false;
  });

  afterAll(() => harness?.destroy());

  // The scene used to ask for the physics to be updated on every frame, which
  // Phaser already does: the world stepped twice a frame, so gravity pulled
  // twice as hard as its numbers said and the jump the generator planned
  // with was twice as high and twice as long as the one the player had.
  it('steps the physics once a frame: gravity pulls as hard as its numbers say', () => {
    const body = game.player.body;
    body.reset(200, 60);
    body.setGravityY(PLAYER_GRAVITY);
    const frame = 1000 / 60;

    game.sys.step(1000, frame);

    expect(body.velocity.y).toBeCloseTo(((WORLD_GRAVITY + PLAYER_GRAVITY) * frame) / 1000, 3);
  });
});
