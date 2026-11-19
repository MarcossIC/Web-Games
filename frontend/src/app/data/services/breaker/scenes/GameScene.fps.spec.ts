import * as Phaser from 'phaser';
import { BreakerBridgeEvents } from '@app/data/models/breaker/BreakerBridge';
import { EventBus } from '@app/data/services/phaser/EventBus';
import { BootScene } from './BootScene';
import { GameScene } from './GameScene';
import { BreakerSceneKeys } from './scene-keys';

/** How long the real loop runs while it is measured. */
const MEASURE_MS = 10000;

/**
 * The 60 fps check in real time: the real game on WebGL (software WebGL in
 * headless Chrome, like the user's machine), its own requestAnimationFrame
 * loop, a bot keeping a 12-ball rally with lasers and novas going. Unlike
 * the smoke specs nothing is stepped by hand: every frame is one the
 * browser asked for, so the frame times are the ones a player gets.
 */
describe('GameScene frame rate (real loop, WebGL)', () => {
  let game: Phaser.Game | undefined;
  let parent: HTMLDivElement | undefined;

  afterEach(async () => {
    if (!game) return;
    const dying = game;
    await new Promise<void>((done) => {
      dying.events.once(Phaser.Core.Events.DESTROY, () => done());
      dying.destroy(true);
    });
    parent?.remove();
    game = undefined;
  });

  it('holds about 60 fps through a busy rally', async () => {
    parent = document.createElement('div');
    document.body.appendChild(parent);
    const booting = new Phaser.Game({
      type: Phaser.WEBGL,
      parent,
      width: 960,
      height: 720,
      banner: false,
      audio: { noAudio: true },
      scene: [BootScene, GameScene],
    });
    game = booting;
    await new Promise<void>((ready) => EventBus.once(BreakerBridgeEvents.READY, () => ready()));
    if (booting.renderer.type !== Phaser.WEBGL) {
      pending('No WebGL in this browser: the frame rate is measured on WebGL only.');
      return;
    }
    const scene = booting.scene.getScene(BreakerSceneKeys.GAME) as GameScene;
    EventBus.emit(BreakerBridgeEvents.SET_MUTED, true);
    EventBus.emit(BreakerBridgeEvents.PLAY);

    const deltas: number[] = [];
    let frame = 0;
    let boosted = false;
    let maxBalls = 0;
    const onStep = (_time: number, delta: number) => {
      frame++;
      deltas.push(delta);
      const run = scene.run;
      const state = run.state;
      // Keep the paddle under the lowest falling ball and click now and then:
      // serves, magnet catches, lasers.
      let low = state.balls[0];
      let alive = 0;
      for (const ball of state.balls) {
        if (!ball.alive) continue;
        alive++;
        if (ball.vy > 0 && (!low || ball.y > low.y)) low = ball;
      }
      if (deltas.length > 0) maxBalls = Math.max(maxBalls, alive);
      if (low) scene.inputState.pointerMove(low.x, false);
      if (frame % 20 === 0) {
        scene.inputState.pointerDown(state.paddle.x, false, performance.now());
        scene.inputState.pointerUp(state.paddle.x, false, performance.now() + 5);
      }
      if (!boosted && state.phase === 'playing') {
        boosted = true;
        run.applyPowerUp('multi');
        run.applyPowerUp('multi');
        run.applyPowerUp('laser');
        run.applyPowerUp('nova');
      } else if (state.phase === 'playing' && alive > 0 && alive < 6 && frame % 30 === 0) {
        // The bot loses balls: keep the screen busy for the whole measure.
        run.applyPowerUp('multi');
        run.applyPowerUp('laser');
      }
    };
    booting.events.on(Phaser.Core.Events.STEP, onStep);
    // The first second warms up shaders and textures; it is not counted.
    await new Promise((wait) => setTimeout(wait, 1000));
    deltas.length = 0;
    const startedAt = performance.now();
    await new Promise((wait) => setTimeout(wait, MEASURE_MS));
    const elapsed = performance.now() - startedAt;
    booting.events.off(Phaser.Core.Events.STEP, onStep);

    const fps = (deltas.length * 1000) / elapsed;
    const sorted = [...deltas].sort((a, b) => a - b);
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const slow = deltas.filter((d) => d > 1000 / 30).length;
    const gl = (booting.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown';
    console.log(
      `[breaker-fps] ${fps.toFixed(1)} fps over ${(elapsed / 1000).toFixed(1)} s, ` +
        `p99 frame ${p99.toFixed(1)} ms, ${slow} frames over 33 ms, ` +
        `up to ${maxBalls} balls at once, renderer ${renderer}`
    );

    // The measure only counts if the rally was busy.
    expect(maxBalls).toBeGreaterThanOrEqual(6);
    expect(fps).toBeGreaterThan(55);
    expect(slow / deltas.length).toBeLessThan(0.01);
  }, MEASURE_MS + 20000);
});
