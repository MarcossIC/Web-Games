import { isDevMode } from '@angular/core';
import * as Phaser from 'phaser';
import { BreakerTexture } from '@app/data/models/breaker/BreakerKeys';
import { BreakerAudio } from '../assets/breaker-audio';
import { BreakerEngine } from '../engine/breaker-engine';
import { WORLD } from '../engine/config';
import { type BreakerRecords, emptyRecords } from '../engine/records';
import type { RunSummary } from '../engine/types';
import { BackgroundView } from '../view/BackgroundView';
import { BallLayer } from '../view/BallLayer';
import { Banners } from '../view/Banners';
import { BarrierView } from '../view/BarrierView';
import { BossView } from '../view/BossView';
import { BrickLayer } from '../view/BrickLayer';
import { CapsuleLayer } from '../view/CapsuleLayer';
import { EventReactor, type ReactorHost } from '../view/EventReactor';
import { FxLayer } from '../view/FxLayer';
import { Hud } from '../view/Hud';
import { InputController } from '../view/InputController';
import { LaserLayer } from '../view/LaserLayer';
import { ballLook, findEffect, readBreakerFlags, readStartSector } from '../view/looks';
import { PaddleView } from '../view/PaddleView';
import { type BridgeHost, SceneBridge } from '../view/SceneBridge';
import { createLayers, DEPTH } from '../view/scene-kit';
import { cardCanContinue, type ClearedSector, sectorCardText } from '../view/sector-card';
import { BreakerSceneKeys } from './scene-keys';

/**
 * Registry key of an optional `(seed) => BreakerEngine`. Only specs set it,
 * to play a fixed layout; the game always builds `new BreakerEngine({ seed })`.
 */
export const BREAKER_ENGINE_FACTORY = 'breaker-engine-factory';
export type BreakerEngineFactory = (seed: number) => BreakerEngine;

/**
 * Registry key of a `() => BreakerRecords`: the page's controller owns the
 * records, the scene only reads them. Asked again on every create, so a
 * restart sees the run the page just recorded. Missing: empty records.
 */
export const BREAKER_RECORDS_SOURCE = 'breaker-records-source';
export type BreakerRecordsSource = () => BreakerRecords;

export interface GameSceneData {
  /** Start playing at once (RESTART) instead of waiting for PLAY. */
  autoplay?: boolean;
}

/** How long the paddle powers down before the page is told the run is over. */
export const GAME_OVER_DELAY_MS = 900;

type Mode = 'ready' | 'running' | 'paused' | 'over';

function randomSeed(): number {
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

/**
 * The Nova Breaker run. An orchestrator: the engine plays, the view modules
 * in `../view` draw and react, this scene wires them and owns the flow
 * (ready -> running <-> paused -> over) the page drives through the bridge.
 *
 * Per frame: sample input -> engine.update -> react to its events -> draw.
 * Nothing in that path allocates: every sprite, text and particle comes
 * from pools built in create().
 */
export class GameScene extends Phaser.Scene implements BridgeHost, ReactorHost {
  private engine!: BreakerEngine;
  private mode: Mode = 'ready';
  private autoplay = false;
  /** Survives a restart (a new AudioContext would need a new gesture); closed on destroy. */
  private audio: BreakerAudio | null = null;
  private controls!: InputController;
  private bridge!: SceneBridge;
  private reactor!: EventReactor;
  private records: BreakerRecords = emptyRecords();

  private background!: BackgroundView;
  private bricks!: BrickLayer;
  private capsules!: CapsuleLayer;
  private lasers!: LaserLayer;
  private barrier!: BarrierView;
  private balls!: BallLayer;
  private paddle!: PaddleView;
  private fx!: FxLayer;
  private boss!: BossView;
  private hud!: Hud;
  private banners!: Banners;

  private timeScale = 1;
  private gameOverTimer: Phaser.Time.TimerEvent | null = null;
  private finalSummary: RunSummary | null = null;

  constructor() {
    super(BreakerSceneKeys.GAME);
  }

  /** The run being played (specs read it). */
  get run(): BreakerEngine {
    return this.engine;
  }

  /** The input the scene samples (specs drive it). */
  get inputState() {
    return this.controls.state;
  }

  get runMode(): Mode {
    return this.mode;
  }

  init(data?: GameSceneData): void {
    this.autoplay = data?.autoplay === true;
  }

  create(): void {
    const flags = readBreakerFlags(typeof window === 'undefined' ? '' : window.location.search, isDevMode());
    const source = this.registry.get(BREAKER_RECORDS_SOURCE) as BreakerRecordsSource | undefined;
    this.records = typeof source === 'function' ? source() : emptyRecords();
    this.mode = 'ready';
    this.timeScale = 1;
    this.gameOverTimer = null;
    this.finalSummary = null;

    const layers = createLayers(this);
    const { world, ui } = layers;
    this.background = new BackgroundView(this, world, randomSeed());
    this.bricks = new BrickLayer(this, world);
    this.capsules = new CapsuleLayer(this, world);
    this.lasers = new LaserLayer(this, world);
    this.barrier = new BarrierView(this, world);
    this.balls = new BallLayer(this, world);
    this.paddle = new PaddleView(this, world);
    this.fx = new FxLayer(this, world, ui);
    this.boss = new BossView(this, world, ui, this.fx);
    ui.add(this.add.image(0, 0, BreakerTexture.CRT_OVERLAY).setOrigin(0, 0).setDepth(DEPTH.OVERLAY));
    this.hud = new Hud(this, ui, this.records.best?.score ?? 0, flags.fps);
    this.banners = new Banners(this, ui);

    this.audio ??= new BreakerAudio();
    const audio = this.audio;
    // The audio outlives a restart: a run that ended in slow motion must not keep it.
    audio.setSlowMotion(false);
    this.controls = new InputController(
      this,
      () => audio.unlock(),
      () => this.engine.state.paddle
    );
    this.reactor = new EventReactor(
      {
        audio,
        fx: this.fx,
        hud: this.hud,
        banners: this.banners,
        bricks: this.bricks,
        paddle: this.paddle,
        barrier: this.barrier,
        background: this.background,
        boss: this.boss,
      },
      this
    );
    this.engine = this.newEngine();
    this.bridge = new SceneBridge(this.game, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onDestroy, this);

    // The first sector, drawn behind the How to play sheet.
    this.draw(0);
    if (this.autoplay) {
      // RESTART comes from a click on the page: the page has its gesture.
      audio.unlock();
      this.start();
    } else {
      this.bridge.ready();
    }
  }

  override update(_time: number, delta: number): void {
    // A paused scene gets no update at all (scene.pause): only 'ready' idles here.
    if (this.mode === 'ready') {
      this.background.sync(delta, 1, WORLD.WIDTH / 2);
      return;
    }
    const input = this.controls.sample();
    if (this.banners.cardUp) {
      // The card owns the launch press: it must not also serve the next ball.
      const pressed = input.launchPressed;
      input.launchPressed = false;
      if (cardCanContinue(this.banners.cardElapsedMs, pressed)) this.continueSector();
    }
    const events = this.engine.update(delta, input);
    // Before the events: the last brick's boom rings clear over a world already muffled.
    this.audio?.setSlowMotion(this.engine.state.timeScale < 1);
    this.reactor.handle(events, this.engine.state);
    this.draw(delta);
  }

  // ------------------------------------------------------------ BridgeHost

  play(): void {
    if (this.mode === 'ready') {
      this.start();
    } else if (this.mode === 'paused') {
      this.mode = 'running';
      this.controls.releaseAll();
      this.controls.setCapture(true);
      this.scene.resume();
    }
  }

  pause(): void {
    if (this.mode !== 'running') return;
    this.mode = 'paused';
    this.controls.releaseAll();
    this.controls.setCapture(false);
    this.scene.pause();
  }

  restart(): void {
    this.controls.setCapture(false);
    const data: GameSceneData = { autoplay: true };
    this.scene.restart(data);
  }

  setMuted(muted: boolean): void {
    this.audio?.setMuted(muted);
  }

  lostFocus(): void {
    if (this.mode !== 'running') return;
    this.pause();
    this.bridge.autoPaused();
  }

  // ------------------------------------------------------------ ReactorHost

  sectorCleared(cleared: ClearedSector): void {
    // Copied: the event belongs to the engine's reused array.
    const text = sectorCardText(
      {
        sector: cleared.sector,
        timeMs: cleared.timeMs,
        parTimeMs: cleared.parTimeMs,
        bonus: cleared.bonus,
        noMiss: cleared.noMiss,
        bossBonus: cleared.bossBonus,
      },
      this.records.bestSectorTimes[cleared.sector]
    );
    this.banners.showCard(text, this.engine.state.theme);
  }

  gameOver(summary: RunSummary): void {
    if (this.mode === 'over') return;
    this.mode = 'over';
    this.finalSummary = summary;
    this.controls.setCapture(false);
    // From here PAUSE is ignored (mode is 'over'): the page must not offer it either.
    this.bridge.runEnding();
    this.gameOverTimer = this.time.delayedCall(GAME_OVER_DELAY_MS, this.announceGameOver, undefined, this);
  }

  // ------------------------------------------------------------ flow

  private start(): void {
    this.mode = 'running';
    this.controls.releaseAll();
    this.controls.setCapture(true);
  }

  private continueSector(): void {
    this.banners.hideCard();
    this.engine.nextSector();
  }

  private announceGameOver(): void {
    this.gameOverTimer = null;
    if (this.finalSummary) this.bridge.gameOver(this.finalSummary);
  }

  private newEngine(): BreakerEngine {
    const seed = randomSeed();
    const factory = this.registry.get(BREAKER_ENGINE_FACTORY) as BreakerEngineFactory | undefined;
    if (typeof factory === 'function') return factory(seed);
    const startSector = readStartSector(typeof window === 'undefined' ? '' : window.location.search, isDevMode());
    return new BreakerEngine({ seed, startSector });
  }

  private draw(dtMs: number): void {
    const state = this.engine.state;
    const ts = state.timeScale;
    if (ts !== this.timeScale) {
      this.timeScale = ts;
      this.tweens.timeScale = ts;
      this.fx.setTimeScale(ts);
    }
    const nova = state.novaRemainingMs > 0;
    const fire = findEffect(state.effects, 'fire') !== null;

    this.background.sync(dtMs, ts, this.paddle.x || WORLD.WIDTH / 2);
    this.bricks.sync(state, dtMs);
    this.boss.sync(state, dtMs);
    this.capsules.sync(state, dtMs);
    this.lasers.sync(state);
    this.barrier.sync(state, dtMs);
    this.paddle.sync(state, dtMs);
    this.balls.sync(state, ballLook(fire, nova));
    this.fx.update(dtMs);
    this.hud.sync(state, dtMs, this.time.now);
    this.hud.setTouch(this.controls.touch);
    this.banners.setTouch(this.controls.touch);
    this.banners.sync(state, dtMs);
  }

  // ------------------------------------------------------------ teardown

  private onShutdown(): void {
    this.teardown(false);
  }

  private onDestroy(): void {
    this.teardown(true);
    void this.audio?.destroy();
    this.audio = null;
  }

  /**
   * Everything that outlives the scene's display list: EventBus and game
   * listeners, input handlers, key captures, timers. Runs on SHUTDOWN (a
   * restart) and on DESTROY (the Angular host destroyed the game).
   *
   * On DESTROY the scene's plugins (input, keyboard, clock) heard the event
   * first and are already torn down, along with their listeners and timers:
   * only what lives outside the scene is released then.
   */
  private teardown(destroying: boolean): void {
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.onDestroy, this);
    this.bridge?.destroy();
    this.gameOverTimer = null;
    if (destroying) return;
    this.controls?.destroy();
    this.time.removeAllEvents();
    this.tweens.timeScale = 1;
  }
}
