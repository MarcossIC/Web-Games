import type { BreakerEvent, BreakerState } from '../engine/types';
import { EventReactor, type ReactorHost, type ReactorViews } from './EventReactor';
import type { PaddleDeathFx } from './PaddleView';

describe('EventReactor', () => {
  function reactor() {
    const views = {
      audio: jasmine.createSpyObj('audio', ['uiTick', 'overdriveReady', 'bossAlarm']),
      fx: jasmine.createSpyObj('fx', ['release']),
      banners: jasmine.createSpyObj('banners', ['showSector']),
      bricks: jasmine.createSpyObj('bricks', ['playIntro']),
      boss: jasmine.createSpyObj('boss', ['intro']),
    };
    const host = jasmine.createSpyObj<ReactorHost>('host', ['sectorCleared', 'gameOver']);
    return { views, react: new EventReactor(views as unknown as ReactorViews, host) };
  }

  const started: BreakerEvent = { type: 'sector-started', sector: 5 } as BreakerEvent;

  it('sounds a boss alarm of its own on a boss sector, not the Nova-ready chime', () => {
    const { views, react } = reactor();
    react.handle([started], { boss: {}, theme: 0 } as unknown as BreakerState);
    expect(views.boss.intro).toHaveBeenCalled();
    expect(views.audio.bossAlarm).toHaveBeenCalledTimes(1);
    expect(views.audio.overdriveReady).not.toHaveBeenCalled();
  });

  it('still chimes Nova-ready when the meter fills', () => {
    const { views, react } = reactor();
    react.handle([{ type: 'overdrive-ready' }], { boss: null, theme: 0 } as unknown as BreakerState);
    expect(views.audio.overdriveReady).toHaveBeenCalledTimes(1);
    expect(views.audio.bossAlarm).not.toHaveBeenCalled();
  });

  describe('placing and shaping each hit', () => {
    function hitReactor() {
      const audio = jasmine.createSpyObj('audio', [
        'wall',
        'paddle',
        'brick',
        'brickHard',
        'steel',
        'explosion',
        'laser',
        'ballLost',
        'lastBrick',
        'bossHit',
      ]);
      const views = {
        audio,
        fx: jasmine.createSpyObj('fx', ['spark', 'shatter', 'flare', 'float', 'ring', 'shake', 'focus']),
        hud: jasmine.createSpyObj('hud', ['comboHit']),
        paddle: jasmine.createSpyObj('paddle', ['hit']),
        bricks: jasmine.createSpyObj('bricks', ['destroyed']),
        boss: jasmine.createSpyObj('boss', ['hit']),
      };
      const host = jasmine.createSpyObj<ReactorHost>('host', ['sectorCleared', 'gameOver']);
      return { audio, react: new EventReactor(views as unknown as ReactorViews, host) };
    }

    const state = { boss: null, theme: 0, multiplier: 1 } as unknown as BreakerState;

    it('hands every positioned sound the x of its event', () => {
      const { audio, react } = hitReactor();

      react.handle(
        [
          { type: 'wall-hit', x: 12, y: 300 },
          { type: 'steel-hit', x: 140, y: 200 },
          { type: 'explosion', x: 900, y: 100, radius: 60 },
          { type: 'laser-fired', x: 333, y: 640 },
          { type: 'ball-lost', x: 50 },
          { type: 'last-brick', x: 777, y: 90 },
          { type: 'boss-hit', x: 480, y: 120, damage: 1, hpLeft: 9, weak: true },
        ],
        state
      );

      expect(audio.wall).toHaveBeenCalledWith(12);
      expect(audio.steel).toHaveBeenCalledWith(140);
      expect(audio.explosion).toHaveBeenCalledWith(900);
      expect(audio.laser).toHaveBeenCalledWith(333);
      expect(audio.ballLost).toHaveBeenCalledWith(50);
      expect(audio.lastBrick).toHaveBeenCalledWith(777);
      expect(audio.bossHit).toHaveBeenCalledWith(1, true, 480);
    });

    it('tells the paddle sound where on the paddle the ball landed', () => {
      const { audio, react } = hitReactor();

      react.handle([{ type: 'paddle-hit', x: 300, y: 680, offset: 0.8, perfect: false }], state);

      expect(audio.paddle).toHaveBeenCalledWith(false, 0.8, 300);
    });

    it('tells the brick sounds what kind of brick it was and how many hits it has left', () => {
      const { audio, react } = hitReactor();

      react.handle(
        [
          { type: 'brick-hit', brickId: 1, x: 200, y: 100, kind: 'armored', hpLeft: 1 },
          { type: 'brick-destroyed', brickId: 2, x: 640, y: 120, kind: 'prism', tone: 0, points: 10, combo: 2 },
        ],
        state
      );

      expect(audio.brickHard).toHaveBeenCalledWith(1, 200);
      expect(audio.brick).toHaveBeenCalledWith(2, 'prism', 640);
    });
  });

  describe('game over: the paddle overloads, then bursts', () => {
    function deathReactor() {
      const audio = jasmine.createSpyObj('audio', ['paddleOverload', 'paddleBlast', 'gameOver']);
      const fx = jasmine.createSpyObj('fx', ['spark', 'shatter', 'flare', 'ring', 'shake', 'edgeFlash', 'debris', 'flash']);
      const paddle = jasmine.createSpyObj('paddle', ['overload'], { x: 420, y: 690 });
      const host = jasmine.createSpyObj<ReactorHost>('host', ['sectorCleared', 'gameOver']);
      const react = new EventReactor({ audio, fx, paddle } as unknown as ReactorViews, host);
      const summary = { sector: 1 } as unknown as Extract<BreakerEvent, { type: 'game-over' }>['summary'];
      react.handle([{ type: 'game-over', summary }], {} as BreakerState);
      const death = paddle.overload.calls.mostRecent().args[0] as PaddleDeathFx;
      return { audio, fx, paddle, host, death, summary };
    }

    it('starts the overload at once and tells the scene the run ended', () => {
      const { audio, fx, paddle, host, summary } = deathReactor();
      expect(audio.paddleOverload).toHaveBeenCalledWith(420);
      expect(paddle.overload).toHaveBeenCalledTimes(1);
      expect(host.gameOver).toHaveBeenCalledWith(summary);
      // The boom waits for the paddle.
      expect(audio.paddleBlast).not.toHaveBeenCalled();
      expect(fx.debris).not.toHaveBeenCalled();
    });

    it('crackles along the paddle while it overloads', () => {
      const { fx, death } = deathReactor();
      death.crackle(420, 690, 120, 0.2);
      expect(fx.spark).toHaveBeenCalled();
      const [x] = fx.spark.calls.mostRecent().args as number[];
      expect(Math.abs(x - 420)).toBeLessThanOrEqual(60);
    });

    it('bursts where the paddle was: the boom, the tune, its pieces and a shake', () => {
      const { audio, fx, death } = deathReactor();
      death.blast(300, 690, 120);
      expect(audio.paddleBlast).toHaveBeenCalledWith(300);
      expect(audio.gameOver).toHaveBeenCalledTimes(1);
      expect(fx.flash).toHaveBeenCalled();
      expect(fx.debris).toHaveBeenCalledWith(300, 690, 120, jasmine.any(Number), jasmine.any(Number));
      expect(fx.ring).toHaveBeenCalled();
      expect(fx.shake).toHaveBeenCalled();
    });
  });
});
