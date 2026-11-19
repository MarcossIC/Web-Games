import type { BreakerEvent, BreakerState } from '../engine/types';
import { EventReactor, type ReactorHost, type ReactorViews } from './EventReactor';

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
});
