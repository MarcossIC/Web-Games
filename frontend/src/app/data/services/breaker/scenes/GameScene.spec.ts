import * as Phaser from 'phaser';
import { BreakerBridgeEvents } from '@app/data/models/breaker/BreakerBridge';
import { EventBus } from '@app/data/services/phaser/EventBus';
import { BreakerEngine } from '../engine/breaker-engine';
import type { PowerUpKind, RunSummary } from '../engine/types';
import { worldLayout } from '../engine/config';
import { type Board, boardFor, canvasHeight, DESKTOP_BOARD, NOVA_BUTTON, PAUSE_BUTTON } from '../view/board-layout';
import { BootScene } from './BootScene';
import { emptyRecords } from '../engine/records';
import { breakerRecords } from '../breaker-saves';
import {
  BREAKER_BOARD,
  BREAKER_ENGINE_FACTORY,
  BREAKER_RECORDS_SOURCE,
  type BreakerEngineFactory,
  type BreakerRecordsSource,
  GAME_OVER_DELAY_MS,
  GameScene,
} from './GameScene';
import { BreakerSceneKeys } from './scene-keys';

const FRAME_MS = 1000 / 60;
const BRIDGE = [
  BreakerBridgeEvents.PLAY,
  BreakerBridgeEvents.PAUSE,
  BreakerBridgeEvents.RESTART,
  BreakerBridgeEvents.SET_MUTED,
] as const;

interface Booted {
  game: Phaser.Game;
  scene: GameScene;
  /** Runs `frames` game steps by hand, the loop being asleep. */
  step(frames: number, before?: (frame: number) => boolean | void): void;
  destroy(): Promise<void>;
}

function listeners(): number[] {
  return BRIDGE.map((event) => EventBus.listenerCount(event));
}

/**
 * Boots the real game (BootScene -> GameScene) on the Canvas renderer
 * (headless Chrome may have no WebGL), waits for READY, then puts the loop
 * to sleep: from there on frames only run when the spec steps them.
 */
function bootGame(
  factory?: BreakerEngineFactory,
  type: number = Phaser.CANVAS,
  records?: BreakerRecordsSource,
  board: Board = DESKTOP_BOARD
): Promise<Booted> {
  return new Promise((resolve) => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const game = new Phaser.Game({
      type,
      parent,
      width: 960,
      height: canvasHeight(board),
      banner: false,
      audio: { noAudio: true },
      scene: [BootScene, GameScene],
    });
    if (factory) game.registry.set(BREAKER_ENGINE_FACTORY, factory);
    if (records) game.registry.set(BREAKER_RECORDS_SOURCE, records);
    game.registry.set(BREAKER_BOARD, board);
    let time = 0;

    EventBus.once(BreakerBridgeEvents.READY, () => {
      game.loop.sleep();
      time = performance.now();
      resolve({
        game,
        get scene() {
          return game.scene.getScene(BreakerSceneKeys.GAME) as GameScene;
        },
        step(frames, before) {
          for (let i = 0; i < frames; i++) {
            if (before?.(i) === true) return;
            time += FRAME_MS;
            game.step(time, FRAME_MS);
          }
        },
        destroy: () =>
          new Promise<void>((done) => {
            game.events.once(Phaser.Core.Events.DESTROY, () => {
              parent.remove();
              done();
            });
            game.destroy(true);
            game.loop.wake();
          }),
      });
    });
  });
}

/** Keeps the paddle under the first ball, so the rally goes on. */
function follow(booted: Booted): void {
  const ball = booted.scene.run.state.balls[0];
  if (ball) booted.scene.inputState.pointerMove(ball.x, false);
}

/** Taps the launch (click) now and then, for serves and magnet catches. */
function clickEvery(booted: Booted, frame: number, every: number): void {
  if (frame % every !== 0) return;
  booted.scene.inputState.pointerDown(booted.scene.run.state.paddle.x, false, frame * FRAME_MS);
  booted.scene.inputState.pointerUp(booted.scene.run.state.paddle.x, false, frame * FRAME_MS + 10);
}

/** Every game object in the scene, inside layers and containers too. */
function allObjects(scene: Phaser.Scene): Phaser.GameObjects.GameObject[] {
  const out: Phaser.GameObjects.GameObject[] = [];
  const walk = (list: Phaser.GameObjects.GameObject[]) => {
    for (const obj of list) {
      out.push(obj);
      if (obj instanceof Phaser.GameObjects.Layer || obj instanceof Phaser.GameObjects.Container) walk(obj.list);
    }
  };
  walk(scene.sys.displayList.list);
  return out;
}

describe('GameScene (smoke, real Phaser on Canvas)', () => {
  let booted: Booted | null = null;
  let before: number[];

  beforeEach(() => {
    before = listeners();
  });

  afterEach(async () => {
    if (booted) await booted.destroy();
    booted = null;
  });

  it('draws the first sector and waits for PLAY without running the engine', async () => {
    booted = await bootGame();
    expect(booted.scene.sys.renderer.type).toBe(Phaser.CANVAS);
    expect(listeners()).toEqual(before.map((n) => n + 1));
    booted.step(30);
    expect(booted.scene.runMode).toBe('ready');
    expect(booted.scene.run.state.runTimeMs).toBe(0);
    expect(booted.scene.run.state.bricks.length).toBeGreaterThan(0);
  });

  it('shows every label as a BitmapText: no Phaser Text, whose setText re-uploads a texture', async () => {
    booted = await bootGame();
    const objects = allObjects(booted.scene);
    expect(objects.filter((o) => o instanceof Phaser.GameObjects.Text).length).toBe(0);
    expect(objects.filter((o) => o instanceof Phaser.GameObjects.BitmapText).length).toBeGreaterThan(10);
  });

  it('plays a rally with every power-up forced, without throwing', async () => {
    booted = await bootGame();
    const b = booted;
    EventBus.emit(BreakerBridgeEvents.PLAY);
    EventBus.emit(BreakerBridgeEvents.SET_MUTED, true);
    b.step(5);
    expect(b.scene.runMode).toBe('running');
    b.scene.inputState.pointerMove(480, false);
    clickEvery(b, 0, 1);
    b.step(30, () => follow(b));
    expect(b.scene.run.state.phase).toBe('playing');

    const kinds: PowerUpKind[] = ['multi', 'laser', 'fire', 'barrier', 'wide', 'magnet', 'slow', 'life', 'shrink', 'fast', 'nova'];
    for (const kind of kinds) {
      b.scene.run.applyPowerUp(kind);
      b.step(25, (frame) => {
        follow(b);
        clickEvery(b, frame, 12);
      });
    }
    // Nova was just filled: Shift starts it.
    b.scene.inputState.keyDown('overdrive');
    b.scene.inputState.keyDown('fire');
    b.step(400, (frame) => {
      follow(b);
      clickEvery(b, frame, 20);
    });
    b.scene.inputState.keyUp('fire');

    const summary = b.scene.run.summary();
    expect(summary.bricksBroken).toBeGreaterThan(0);
    expect(summary.score).toBeGreaterThan(0);
  });

  it('clears a sector, shows the card and moves on to the next one', async () => {
    // One row of explosives: the first hit chains through all of it.
    booted = await bootGame((seed) => BreakerEngine.forTest({ seed, layout: ['*************'] }));
    const b = booted;
    EventBus.emit(BreakerBridgeEvents.PLAY);
    b.step(2);
    clickEvery(b, 0, 1);
    let sawClearing = false;
    let sawCleared = false;
    b.step(600, () => {
      follow(b);
      const phase = b.scene.run.state.phase;
      sawClearing ||= phase === 'clearing';
      sawCleared ||= phase === 'cleared';
    });
    expect(sawClearing).toBeTrue();
    expect(sawCleared).toBeTrue();
    // The card continued on its own after 2.5 s.
    expect(b.scene.run.state.sector).toBe(2);
    expect(b.scene.run.state.phase).toBe('serve');
  });

  it('plays a boss sector: the core glides, shoots and takes hits, all drawn without throwing', async () => {
    booted = await bootGame((seed) => BreakerEngine.forTest({ seed, startSector: 5 }));
    const b = booted;
    EventBus.emit(BreakerBridgeEvents.PLAY);
    EventBus.emit(BreakerBridgeEvents.SET_MUTED, true);
    b.step(3);
    const boss = b.scene.run.state.boss!;
    expect(boss).toBeTruthy();
    expect(b.scene.run.state.bricks.some((brick) => brick.row < 0)).toBeTrue();
    clickEvery(b, 0, 1);
    b.step(5, () => follow(b));
    b.scene.run.applyPowerUp('laser');
    b.scene.run.applyPowerUp('multi');
    b.scene.inputState.keyDown('fire');
    const startX = boss.x;
    let moved = false;
    let sawPellet = false;
    b.step(700, (frame) => {
      follow(b);
      clickEvery(b, frame, 30);
      const now = b.scene.run.state.boss;
      if (!now) return;
      moved ||= Math.abs(now.x - startX) > 20;
      sawPellet ||= now.pellets.length > 0;
    });
    b.scene.inputState.keyUp('fire');
    const after = b.scene.run.state.boss!;
    expect(moved).toBeTrue();
    expect(sawPellet).toBeTrue();
    expect(after.hp).toBeLessThan(after.maxHp);
  });

  it('destroys the core, plays its outro and moves on to sector 6', async () => {
    const layout = [...Array.from({ length: 8 }, () => '.............'), '............1'];
    booted = await bootGame((seed) => BreakerEngine.forTest({ seed, startSector: 5, layout, bossShields: false, bossHp: 2 }));
    const b = booted;
    EventBus.emit(BreakerBridgeEvents.PLAY);
    EventBus.emit(BreakerBridgeEvents.SET_MUTED, true);
    b.step(2);
    clickEvery(b, 0, 1);
    let sawDefeat = false;
    b.step(2400, (frame) => {
      follow(b);
      clickEvery(b, frame, 25);
      const boss = b.scene.run.state.boss;
      sawDefeat ||= boss !== null && boss !== undefined && !boss.alive;
      return b.scene.run.state.sector === 6;
    });
    expect(sawDefeat).toBeTrue();
    expect(b.scene.run.state.sector).toBe(6);
    expect(b.scene.run.state.boss ?? null).toBeNull();
    b.step(30, () => follow(b));
  });

  it('ends the run: the paddle powers down, then GAME_OVER carries the summary', async () => {
    // Steel only: the sector can never be cleared, and the paddle dodges every ball.
    booted = await bootGame((seed) => BreakerEngine.forTest({ seed, layout: ['#............'] }));
    const b = booted;
    let summary: RunSummary | null = null;
    let frame = 0;
    let overFrame = -1;
    let toldFrame = -1;
    const onOver = (s: RunSummary) => {
      summary = s;
      toldFrame = frame;
    };
    EventBus.on(BreakerBridgeEvents.GAME_OVER, onOver);
    try {
      EventBus.emit(BreakerBridgeEvents.PLAY);
      b.step(5000, () => {
        frame++;
        if (summary) return true;
        if (b.scene.runMode === 'over') {
          if (overFrame < 0) overFrame = frame;
          return false;
        }
        const ball = b.scene.run.state.balls[0];
        b.scene.inputState.pointerMove(ball && ball.x < 480 ? 900 : 60, false);
        clickEvery(b, frame, 30);
        return false;
      });
      expect(overFrame).toBeGreaterThan(0);
      expect(summary).not.toBeNull();
      expect(summary!.sector).toBe(1);
      expect(summary!.timeMs).toBeGreaterThan(0);
      // The page hears about it only once the power-down played.
      const waited = (toldFrame - overFrame) * FRAME_MS;
      expect(waited).toBeGreaterThan(GAME_OVER_DELAY_MS - 3 * FRAME_MS);
      expect(waited).toBeLessThan(GAME_OVER_DELAY_MS + 4 * FRAME_MS);
      expect(b.scene.runMode).toBe('over');
    } finally {
      EventBus.off(BreakerBridgeEvents.GAME_OVER, onOver);
    }
  });

  it('says RUN_ENDING when the power-down starts, and ignores PAUSE until GAME_OVER', async () => {
    booted = await bootGame((seed) => BreakerEngine.forTest({ seed, layout: ['#............'] }));
    const b = booted;
    let frame = 0;
    let endingFrame = -1;
    let overFrame = -1;
    let toldFrame = -1;
    const onEnding = () => (endingFrame = frame);
    const onOver = () => (toldFrame = frame);
    EventBus.on(BreakerBridgeEvents.RUN_ENDING, onEnding);
    EventBus.on(BreakerBridgeEvents.GAME_OVER, onOver);
    try {
      EventBus.emit(BreakerBridgeEvents.PLAY);
      b.step(5000, () => {
        frame++;
        if (toldFrame >= 0) return true;
        if (b.scene.runMode === 'over') {
          if (overFrame < 0) overFrame = frame;
          // The player hits P during the power-down.
          EventBus.emit(BreakerBridgeEvents.PAUSE);
          return false;
        }
        const ball = b.scene.run.state.balls[0];
        b.scene.inputState.pointerMove(ball && ball.x < 480 ? 900 : 60, false);
        clickEvery(b, frame, 30);
        return false;
      });
      expect(overFrame).toBeGreaterThan(0);
      expect(endingFrame).toBeGreaterThan(0);
      expect(endingFrame).toBeLessThanOrEqual(overFrame);
      expect(toldFrame).toBeGreaterThan(endingFrame);
      expect(b.scene.runMode).toBe('over');
    } finally {
      EventBus.off(BreakerBridgeEvents.RUN_ENDING, onEnding);
      EventBus.off(BreakerBridgeEvents.GAME_OVER, onOver);
    }
  });

  it('pauses on PAUSE and on a lost focus, and resumes on PLAY', async () => {
    booted = await bootGame();
    const b = booted;
    const autoPaused = jasmine.createSpy('autoPaused');
    EventBus.on(BreakerBridgeEvents.AUTO_PAUSED, autoPaused);
    try {
      EventBus.emit(BreakerBridgeEvents.PLAY);
      // Served: the run clock only ticks once the ball is in play.
      b.step(10, (f) => clickEvery(b, f, 100));
      EventBus.emit(BreakerBridgeEvents.PAUSE);
      b.step(1);
      expect(b.scene.sys.isPaused()).toBeTrue();
      const frozen = b.scene.run.state.runTimeMs;
      b.step(20);
      expect(b.scene.run.state.runTimeMs).toBe(frozen);
      expect(autoPaused).not.toHaveBeenCalled();

      EventBus.emit(BreakerBridgeEvents.PLAY);
      b.step(10);
      expect(b.scene.sys.isPaused()).toBeFalse();
      expect(b.scene.run.state.runTimeMs).toBeGreaterThan(frozen);

      b.game.events.emit(Phaser.Core.Events.BLUR);
      b.step(1);
      expect(autoPaused).toHaveBeenCalledTimes(1);
      expect(b.scene.sys.isPaused()).toBeTrue();
      EventBus.emit(BreakerBridgeEvents.PLAY);
      b.step(2);
      expect(b.scene.sys.isPaused()).toBeFalse();
    } finally {
      EventBus.off(BreakerBridgeEvents.AUTO_PAUSED, autoPaused);
    }
  });

  it('RESTART starts a new run at once, from a pause too, with one set of listeners', async () => {
    booted = await bootGame();
    const b = booted;
    const ready = jasmine.createSpy('ready');
    EventBus.on(BreakerBridgeEvents.READY, ready);
    try {
      EventBus.emit(BreakerBridgeEvents.PLAY);
      b.step(20);
      EventBus.emit(BreakerBridgeEvents.PAUSE);
      b.step(1);
      const old = b.scene.run;
      EventBus.emit(BreakerBridgeEvents.RESTART);
      // Served: the run clock only ticks once the ball is in play. The first step
      // starts the new run (and releases every input), so keep tapping.
      b.step(5, (f) => clickEvery(b, f, 2));
      expect(b.scene.run).not.toBe(old);
      expect(b.scene.runMode).toBe('running');
      expect(b.scene.sys.isPaused()).toBeFalse();
      expect(b.scene.run.state.runTimeMs).toBeGreaterThan(0);
      // The page is already playing: no second READY (it would reopen How to play).
      expect(ready).not.toHaveBeenCalled();
      expect(listeners()).toEqual(before.map((n) => n + 1));
      b.step(60);
    } finally {
      EventBus.off(BreakerBridgeEvents.READY, ready);
    }
  });

  it('takes the records from the page on every create, never from localStorage', async () => {
    const getItem = spyOn(localStorage, 'getItem').and.callThrough();
    const records = emptyRecords();
    records.best = { score: 4321, sector: 3, timeMs: 90000, date: '2026-11-19' };
    const source = jasmine.createSpy('records').and.returnValue(records);
    booted = await bootGame(undefined, Phaser.CANVAS, source);
    expect(source).toHaveBeenCalledTimes(1);
    EventBus.emit(BreakerBridgeEvents.PLAY);
    booted.step(2);
    EventBus.emit(BreakerBridgeEvents.RESTART);
    booted.step(2);
    // A restart reads them again: the page may have just recorded the run that ended.
    expect(source).toHaveBeenCalledTimes(2);
    expect(getItem).not.toHaveBeenCalledWith(breakerRecords.key);
  });

  it('also runs on WebGL when the browser has it (NineSlice paddle, tinted particles)', async () => {
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) {
      pending('no WebGL in this browser');
      return;
    }
    booted = await bootGame(undefined, Phaser.WEBGL);
    const b = booted;
    expect(b.scene.sys.renderer.type).toBe(Phaser.WEBGL);
    EventBus.emit(BreakerBridgeEvents.PLAY);
    b.step(3);
    clickEvery(b, 0, 1);
    for (const kind of ['laser', 'wide', 'magnet', 'barrier', 'multi', 'nova'] as PowerUpKind[]) {
      b.scene.run.applyPowerUp(kind);
      b.step(40, (frame) => {
        follow(b);
        clickEvery(b, frame, 15);
      });
    }
    b.scene.inputState.keyDown('overdrive');
    b.step(200, () => follow(b));
    expect(b.scene.run.summary().bricksBroken).toBeGreaterThan(0);
  });

  it('uploads no texture while playing on WebGL once warmed up (HUD, combo, floaters, banners)', async () => {
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) {
      pending('no WebGL in this browser');
      return;
    }
    booted = await bootGame(undefined, Phaser.WEBGL);
    const b = booted;
    const gl = (b.scene.sys.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl;
    EventBus.emit(BreakerBridgeEvents.PLAY);
    b.step(3);
    clickEvery(b, 0, 1);
    // Warm-up: every kind of effect, label and banner shows once.
    for (const kind of ['multi', 'laser', 'fire', 'life', 'nova'] as PowerUpKind[]) {
      b.scene.run.applyPowerUp(kind);
      b.step(30, (frame) => {
        follow(b);
        clickEvery(b, frame, 10);
      });
    }

    let uploads = 0;
    const image = gl.texImage2D;
    const sub = gl.texSubImage2D;
    const counted = <F extends (...args: never[]) => unknown>(fn: F): F =>
      function (this: unknown, ...args: never[]) {
        uploads++;
        return fn.apply(this, args);
      } as F;
    gl.texImage2D = counted(image);
    gl.texSubImage2D = counted(sub);
    const scoreBefore = b.scene.run.state.score;
    try {
      b.scene.inputState.keyDown('fire');
      for (const kind of ['multi', 'wide', 'magnet', 'life', 'slow', 'nova'] as PowerUpKind[]) {
        b.scene.run.applyPowerUp(kind);
        b.step(50, (frame) => {
          follow(b);
          clickEvery(b, frame, 8);
        });
      }
      b.scene.inputState.keyUp('fire');
    } finally {
      gl.texImage2D = image;
      gl.texSubImage2D = sub;
    }
    // The run went on (the HUD had new values to show) and nothing was re-uploaded.
    expect(b.scene.run.state.score).toBeGreaterThan(scoreBefore);
    expect(uploads).toBe(0);
  });

  it('leaves no EventBus listener behind when the game is destroyed', async () => {
    booted = await bootGame();
    EventBus.emit(BreakerBridgeEvents.PLAY);
    booted.step(10);
    await booted.destroy();
    booted = null;
    expect(listeners()).toEqual(before);
    // A late page event after leaving the route reaches nothing and throws nothing.
    expect(() => {
      EventBus.emit(BreakerBridgeEvents.PLAY);
      EventBus.emit(BreakerBridgeEvents.SET_MUTED, false);
    }).not.toThrow();
  });
});

describe('GameScene on a tall board (a phone held upright)', () => {
  let booted: Booted | null = null;
  const board = boardFor(390, 844);

  /** A finger (or the mouse) as Phaser would report it, in canvas px. */
  function pointer(x: number, y: number, id = 1) {
    return { x, y, id, wasTouch: true, locked: false, downTime: 0, upTime: 40 } as unknown as Phaser.Input.Pointer;
  }
  const tap = (b: Booted, p: Phaser.Input.Pointer) => {
    b.scene.input.emit(Phaser.Input.Events.POINTER_DOWN, p);
    b.scene.input.emit(Phaser.Input.Events.POINTER_UP, p);
  };
  /** Canvas y of a point in UI coordinates (the HUD rows are above y = 0). */
  const canvasY = (uiY: number) => uiY + board.extra;

  afterEach(async () => {
    if (booted) await booted.destroy();
    booted = null;
  });

  it('builds the engine with the board height, and the cameras keep engine coordinates', async () => {
    booted = await bootGame(undefined, Phaser.CANVAS, undefined, board);
    const layout = worldLayout(board.height);
    expect(booted.scene.run.layout.height).toBe(board.height);
    expect(booted.scene.run.state.paddle.y).toBe(layout.paddleY);
    const main = booted.scene.cameras.main;
    expect([main.x, main.y, main.width, main.height]).toEqual([0, board.extra, 960, board.height]);
    const ui = booted.scene.cameras.getCamera('breaker-ui')!;
    expect([ui.height, ui.scrollY]).toEqual([canvasHeight(board), -board.extra]);
  });

  it('keeps the desktop board exactly as it was', async () => {
    booted = await bootGame();
    const main = booted.scene.cameras.main;
    expect([main.x, main.y, main.width, main.height]).toEqual([0, 0, 960, 720]);
    expect(booted.scene.run.state.paddle.y).toBe(664);
  });

  it('puts the barrier strip on the layout line and nothing but decoration in the thumb room', async () => {
    booted = await bootGame(undefined, Phaser.CANVAS, undefined, board);
    const layout = worldLayout(board.height);
    const strip = allObjects(booted.scene).find((o) => o instanceof Phaser.GameObjects.TileSprite) as Phaser.GameObjects.TileSprite;
    expect(strip.y).toBe(layout.barrierY);
    // Read-outs that sit under the paddle on desktop (effects, combo) live above it here.
    const thumbTop = layout.paddleY + 18;
    const intruders = allObjects(booted.scene).filter(
      (o) => o instanceof Phaser.GameObjects.BitmapText && o.visible && (o as Phaser.GameObjects.BitmapText).y > thumbTop
    );
    expect(intruders.length).toBe(0);
  });

  it('the Pause button asks the page to pause, once, on release', async () => {
    booted = await bootGame(undefined, Phaser.CANVAS, undefined, board);
    const b = booted;
    EventBus.emit(BreakerBridgeEvents.PLAY);
    b.step(2);
    const asked = jasmine.createSpy('pauseRequested');
    EventBus.on(BreakerBridgeEvents.PAUSE_REQUESTED, asked);
    try {
      const p = pointer(PAUSE_BUTTON.x + PAUSE_BUTTON.w / 2, canvasY(PAUSE_BUTTON.y + PAUSE_BUTTON.h / 2));
      b.scene.input.emit(Phaser.Input.Events.POINTER_DOWN, p);
      expect(asked).not.toHaveBeenCalled();
      b.scene.input.emit(Phaser.Input.Events.POINTER_UP, p);
      expect(asked).toHaveBeenCalledTimes(1);
      // The scene itself waits for the page's answer.
      expect(b.scene.runMode).toBe('running');
    } finally {
      EventBus.off(BreakerBridgeEvents.PAUSE_REQUESTED, asked);
    }
  });

  it('a press that slides off the Pause button does not pause', async () => {
    booted = await bootGame(undefined, Phaser.CANVAS, undefined, board);
    const b = booted;
    EventBus.emit(BreakerBridgeEvents.PLAY);
    b.step(2);
    const asked = jasmine.createSpy('pauseRequested');
    EventBus.on(BreakerBridgeEvents.PAUSE_REQUESTED, asked);
    try {
      b.scene.input.emit(Phaser.Input.Events.POINTER_DOWN, pointer(PAUSE_BUTTON.x + 10, canvasY(PAUSE_BUTTON.y + 10)));
      b.scene.input.emit(Phaser.Input.Events.POINTER_UP, pointer(300, canvasY(500)));
      expect(asked).not.toHaveBeenCalled();
    } finally {
      EventBus.off(BreakerBridgeEvents.PAUSE_REQUESTED, asked);
    }
  });

  it('the NOVA button feeds Overdrive like the two-finger tap', async () => {
    booted = await bootGame(undefined, Phaser.CANVAS, undefined, board);
    const b = booted;
    EventBus.emit(BreakerBridgeEvents.PLAY);
    b.step(2);
    tap(b, pointer(NOVA_BUTTON.x + NOVA_BUTTON.w / 2, canvasY(NOVA_BUTTON.y + NOVA_BUTTON.h / 2)));
    expect(b.scene.inputState.sample().overdrivePressed).toBeTrue();
  });

  it('a tap on the HUD band never launches nor steers', async () => {
    booted = await bootGame(undefined, Phaser.CANVAS, undefined, board);
    const b = booted;
    EventBus.emit(BreakerBridgeEvents.PLAY);
    b.step(2);
    const x = b.scene.run.state.paddle.x;
    tap(b, pointer(40, canvasY(-90)));
    tap(b, pointer(40, canvasY(30)));
    const frame = b.scene.inputState.sample();
    expect(frame.launchPressed).toBeFalse();
    expect(frame.pointerX).not.toBe(40);
    expect(frame.fireHeld).toBeFalse();
    expect(b.scene.run.state.paddle.x).toBe(x);
  });

  it('a drag in the thumb room moves the paddle relatively and a still tap there launches', async () => {
    booted = await bootGame(undefined, Phaser.CANVAS, undefined, board);
    const b = booted;
    EventBus.emit(BreakerBridgeEvents.PLAY);
    b.step(2);
    const layout = worldLayout(board.height);
    const paddleX = b.scene.run.state.paddle.x;
    const down = pointer(100, canvasY(layout.height - 40));
    b.scene.input.emit(Phaser.Input.Events.POINTER_DOWN, down);
    expect(b.scene.inputState.sample().pointerX).toBe(paddleX);
    b.scene.input.emit(Phaser.Input.Events.POINTER_MOVE, pointer(140, canvasY(layout.height - 40)));
    expect(b.scene.inputState.sample().pointerX).toBeGreaterThan(paddleX);
    b.scene.input.emit(Phaser.Input.Events.POINTER_UP, pointer(140, canvasY(layout.height - 40)));
    b.scene.input.emit(Phaser.Input.Events.POINTER_DOWN, pointer(500, canvasY(layout.height - 40)));
    b.scene.input.emit(Phaser.Input.Events.POINTER_UP, pointer(502, canvasY(layout.height - 40)));
    expect(b.scene.inputState.sample().launchPressed).toBeTrue();
  });
});
