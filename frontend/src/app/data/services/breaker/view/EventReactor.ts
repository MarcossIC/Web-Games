import { BREAKER_POWER_UP_INFO } from '@app/data/models/breaker/BreakerPowerUpInfo';
import type { BreakerAudio } from '../assets/breaker-audio';
import { hexToNumber } from '../assets/color';
import { EFFECTS } from '../engine/config';
import type { BreakerEvent, BreakerState, PowerUpKind, RunSummary } from '../engine/types';
import type { BackgroundView } from './BackgroundView';
import type { Banners } from './Banners';
import type { BarrierView } from './BarrierView';
import type { BossView } from './BossView';
import type { BrickLayer } from './BrickLayer';
import type { FxLayer } from './FxLayer';
import type { Hud } from './Hud';
import { pointsLabel } from './hud-format';
import { shardColor } from './looks';
import type { PaddleView } from './PaddleView';
import { COLOR } from './scene-kit';
import type { ClearedSector } from './sector-card';

/** What the reactor needs from the scene itself. */
export interface ReactorHost {
  sectorCleared(cleared: ClearedSector): void;
  gameOver(summary: RunSummary): void;
}

export interface ReactorViews {
  audio: BreakerAudio;
  fx: FxLayer;
  hud: Hud;
  banners: Banners;
  bricks: BrickLayer;
  paddle: PaddleView;
  barrier: BarrierView;
  background: BackgroundView;
  boss: BossView;
}

const POWER_UP_LABEL = Object.fromEntries(
  Object.entries(BREAKER_POWER_UP_INFO).map(([kind, info]) => [kind, info.label.toUpperCase()])
) as Record<PowerUpKind, string>;
const POWER_UP_COLOR = Object.fromEntries(
  Object.entries(BREAKER_POWER_UP_INFO).map(([kind, info]) => [kind, hexToNumber(info.color)])
) as Record<PowerUpKind, number>;

const HIT_SHARD = 0xd8d0ff;
const STEEL_SPARK = 0xc9d1e6;
const WALL_SPARK = 0x8cf0ff;

/**
 * BreakerEvent -> sound and effects (SCENE.md, Eventos -> reacción). The
 * events array is the engine's and is only valid during handle(): nothing
 * here keeps a reference to an event.
 */
export class EventReactor {
  constructor(
    private readonly views: ReactorViews,
    private readonly host: ReactorHost
  ) {}

  handle(events: readonly BreakerEvent[], state: BreakerState): void {
    for (let i = 0; i < events.length; i++) this.react(events[i], state);
  }

  private react(e: BreakerEvent, state: BreakerState): void {
    const { audio, fx, hud, banners, paddle } = this.views;
    switch (e.type) {
      case 'sector-started':
        audio.uiTick();
        fx.release();
        banners.showSector(e.sector, state.theme);
        this.views.bricks.playIntro();
        if (state.boss) {
          // A boss sector: its own WARNING banner over the sector one, and an alarm.
          this.views.boss.intro();
          audio.bossAlarm();
        }
        break;
      case 'ball-launched':
        audio.launch(e.x);
        fx.flare(e.x, e.y, 56, 260, COLOR.CYAN);
        fx.ring(e.x, e.y, 10, 64, 300, COLOR.CYAN, 0.55);
        break;
      case 'paddle-hit':
        audio.paddle(e.perfect, e.offset, e.x);
        paddle.hit();
        fx.spark(e.x, e.y, 4, COLOR.CYAN);
        if (e.perfect) {
          fx.flare(e.x, e.y, 96, 420, COLOR.YELLOW);
          fx.float(e.x, e.y - 34, 'PERFECT', COLOR.YELLOW, 1.15);
        }
        break;
      case 'wall-hit':
        audio.wall(e.x);
        fx.spark(e.x, e.y, 3, WALL_SPARK);
        break;
      case 'brick-hit':
        audio.brickHard(e.hpLeft, e.x);
        fx.shatter(e.x, e.y, 3, HIT_SHARD);
        break;
      case 'brick-destroyed': {
        audio.brick(e.combo, e.kind, e.x);
        this.views.bricks.destroyed(e.brickId);
        const color = shardColor(e.kind, state.theme, e.tone);
        fx.shatter(e.x, e.y, 10 + Math.floor(Math.random() * 5), color);
        fx.spark(e.x, e.y, 2, color);
        hud.comboHit();
        if (e.combo >= 3) fx.float(e.x, e.y, pointsLabel(e.points, state.multiplier), color, 0.9);
        break;
      }
      case 'steel-hit':
        audio.steel(e.x);
        fx.spark(e.x, e.y, 6, STEEL_SPARK);
        break;
      case 'explosion':
        audio.explosion(e.x);
        fx.ring(e.x, e.y, 24, e.radius * 2, 420, COLOR.ORANGE);
        fx.flare(e.x, e.y, 130, 300, COLOR.YELLOW);
        fx.shake(120, 0.004);
        break;
      case 'ball-split':
        audio.uiTick();
        fx.ring(e.x, e.y, 10, 72, 260, COLOR.CYAN, 0.7);
        break;
      case 'capsule-spawned':
        audio.capsuleSpawn(e.x);
        fx.ring(e.x, e.y, 12, 60, 240, POWER_UP_COLOR[e.kind], 0.5);
        break;
      case 'capsule-caught':
        audio.powerUp(e.kind, e.x);
        fx.ring(e.x, e.y, 20, 130, 360, POWER_UP_COLOR[e.kind], 0.7);
        fx.float(e.x, e.y - 30, POWER_UP_LABEL[e.kind], POWER_UP_COLOR[e.kind], 1.1);
        break;
      case 'laser-fired':
        audio.laser(e.x);
        fx.flare(e.x, e.y, 24, 110, COLOR.MAGENTA);
        break;
      case 'ball-lost':
        audio.ballLost(e.x);
        fx.spark(e.x, 712, 8, COLOR.RED);
        break;
      case 'barrier-used':
        audio.barrier(e.x);
        this.views.barrier.burn();
        fx.spark(e.x, EFFECTS.BARRIER_Y, 10, WALL_SPARK);
        break;
      case 'life-lost':
        audio.lifeLost();
        fx.shake(220, 0.007);
        fx.edgeFlash(COLOR.RED, 0.85);
        break;
      case 'life-gained':
        audio.lifeGained();
        hud.livesChanged();
        fx.float(paddle.x, paddle.y - 44, '+1 UP', COLOR.GREEN, 1.2);
        break;
      case 'overdrive-ready':
        audio.overdriveReady();
        break;
      case 'nova-started':
        // The sound plays on the way in only: a second whoosh as it fades reads as a new nova.
        audio.nova();
        fx.setNova(true);
        this.views.background.setNova(true);
        fx.ring(paddle.x, paddle.y, 40, 900, 700, COLOR.MAGENTA, 0.8);
        fx.float(480, 360, 'NOVA', COLOR.MAGENTA, 2);
        break;
      case 'nova-ended':
        fx.setNova(false);
        this.views.background.setNova(false);
        break;
      case 'combo-lost':
        if (e.combo >= 5) audio.comboLost();
        hud.comboLost();
        break;
      case 'last-brick':
        audio.lastBrick(e.x);
        fx.flare(e.x, e.y, 170, 900, COLOR.WHITE);
        fx.focus(e.x, e.y);
        break;
      case 'sector-cleared':
        audio.sectorClear();
        fx.release();
        this.host.sectorCleared(e);
        break;
      case 'game-over':
        audio.gameOver();
        paddle.powerDown();
        fx.edgeFlash(COLOR.RED, 0.6);
        this.host.gameOver(e.summary);
        break;
      case 'effect-ended':
        break;

      // ---------------------------------------------------------- THE CORE
      case 'boss-hit':
        audio.bossHit(e.damage, e.weak, e.x);
        this.views.boss.hit(e.x, e.y, e.damage, e.weak);
        if (e.damage > 0) hud.comboHit();
        break;
      case 'boss-phase':
        audio.explosion(e.x);
        this.views.boss.phaseChanged(e.phase, e.x, e.y);
        break;
      case 'boss-shot':
        audio.bossShot(e.x);
        fx.flare(e.x, e.y, 70, 220, COLOR.MAGENTA);
        break;
      case 'pellet-hit-paddle':
        audio.steel(e.x);
        paddle.hit();
        fx.spark(e.x, e.y, 10, COLOR.YELLOW);
        fx.ring(e.x, e.y, 10, 90, 260, COLOR.CYAN, 0.7);
        fx.shake(90, 0.003);
        break;
      case 'pellet-destroyed':
        audio.wall(e.x);
        fx.spark(e.x, e.y, 6, COLOR.MAGENTA);
        fx.ring(e.x, e.y, 6, 44, 200, COLOR.MAGENTA, 0.6);
        break;
      case 'shield-restored': {
        const bricks = state.bricks;
        for (let i = 0; i < bricks.length; i++) {
          if (bricks[i].id === e.brickId) {
            this.views.bricks.adopt(bricks[i], state.theme);
            break;
          }
        }
        audio.uiTick();
        fx.ring(e.x, e.y, 10, 96, 320, COLOR.VIOLET, 0.75);
        break;
      }
      case 'boss-defeated':
        audio.bossDown(e.x);
        this.views.boss.defeated(e.x, e.y);
        break;
      case 'rescue':
        if (e.mode === 'capsule') {
          // The capsule itself already chimed (capsule-spawned): a green beacon marks it as help.
          fx.ring(e.x, e.y, 16, 140, 520, COLOR.GREEN, 0.8);
          fx.flare(e.x, e.y, 90, 420, COLOR.GREEN);
        } else {
          audio.uiTick();
          fx.flare(paddle.x, paddle.y, 64, 260, COLOR.GREEN);
        }
        break;
    }
  }
}
