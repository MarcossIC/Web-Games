import * as Phaser from 'phaser';
import { BossArt, bossCoreKey, bossEyeKey, BossTexture, TEXTURE_SCALE } from '@app/data/models/breaker/BreakerKeys';
import { BOSS } from '../engine/config';
import type { BossPhase, BreakerState } from '../engine/types';
import { bossCrackLevel, bossHpShare, DamageGhost, DEFEAT, eyeCharge, hpFillCropPx, WARNING, warningLook } from './boss-look';
import type { FxLayer } from './FxLayer';
import { COLOR, DEPTH } from './scene-kit';
import { clamp01, lerp } from './view-math';

type Image = Phaser.GameObjects.Image;

/** Draw order of the core: under the bricks (its shields never overlap it), pellets over the capsules. */
const Z = {
  RAIL: DEPTH.BRICKS - 0.9,
  HULL: DEPTH.BRICKS - 0.6,
  CRACKS: DEPTH.BRICKS - 0.5,
  EYE: DEPTH.BRICKS - 0.4,
  FLASH: DEPTH.BRICKS - 0.3,
  PELLETS: DEPTH.BARRIER + 1,
  STUN: DEPTH.PADDLE + 0.5,
  HP: DEPTH.HUD - 1,
  WARNING: DEPTH.BANNERS,
} as const;

const HP_X = 480 - BossArt.HP_W / 2;
const HP_Y = 70;
const PHASE_COLOR: Readonly<Record<BossPhase, number>> = { 1: COLOR.CYAN, 2: COLOR.YELLOW, 3: COLOR.MAGENTA };

/**
 * THE CORE on screen: its hull (one texture per phase) with crack overlays,
 * the eye that charges before each volley, the hit flash, its pooled
 * pellets, the jam arcs on the paddle, a HP bar under the HUD (images: a
 * frame, a cropped fill and a trailing ghost, no Text) and its own baked
 * WARNING · CORE banner. Everything is built here once; sync() only moves,
 * crops and fades images, and touches a texture only when its look changes.
 */
export class BossView {
  private readonly rail: Image;
  private readonly hull: Image;
  private readonly cracks: Image;
  private readonly eye: Image;
  private readonly flash: Image;
  private readonly pellets: Image[] = [];
  private readonly stun: Image;
  private readonly hpFrame: Image;
  private readonly hpGhost: Image;
  private readonly hpFill: Image;
  private readonly warning: Image;
  private readonly ghost = new DamageGhost();

  private shown = false;
  private shownPellets = 0;
  private phase: BossPhase = 1;
  private crackLevel = -1;
  private fillPx = -1;
  private ghostPx = -1;
  private clockMs = 0;
  private warningMs = -1;
  /** A phase change: the hull burns white for a moment. */
  private surgeMs = 0;
  /** Real ms since the core fell; -1 while it stands. */
  private defeatMs = -1;
  private nextBurst = 0;
  private finaleDone = false;
  private stunShown = false;

  constructor(
    scene: Phaser.Scene,
    world: Phaser.GameObjects.Layer,
    ui: Phaser.GameObjects.Layer,
    private readonly fx: FxLayer
  ) {
    const image = (layer: Phaser.GameObjects.Layer, key: string, w: number, h: number, depth: number, ox = 0, oy = 0): Image => {
      const img = scene.add.image(0, 0, key).setOrigin(ox, oy).setDisplaySize(w, h).setDepth(depth).setVisible(false);
      layer.add(img);
      return img;
    };
    this.rail = image(world, BossTexture.RAIL, BossArt.RAIL_W, BossArt.RAIL_H, Z.RAIL, 0, 0.5);
    this.hull = image(world, BossTexture.CORE_1, BossArt.WIDTH, BossArt.HEIGHT, Z.HULL);
    this.cracks = image(world, BossTexture.CRACKS_1, BossArt.WIDTH, BossArt.HEIGHT, Z.CRACKS);
    this.flash = image(world, BossTexture.FLASH, BossArt.WIDTH, BossArt.HEIGHT, Z.FLASH);
    this.eye = image(world, BossTexture.EYE_1, BossArt.EYE_W, BossArt.EYE_H, Z.EYE, 0.5, 0.5);
    for (let i = 0; i < BOSS.MAX_PELLETS; i++) {
      this.pellets.push(image(world, BossTexture.PELLET, BossArt.PELLET_SIZE, BossArt.PELLET_SIZE, Z.PELLETS, 0.5, 0.5));
    }
    this.stun = image(world, BossTexture.STUN, BossArt.STUN_W, BossArt.STUN_H, Z.STUN, 0.5, 0.5);
    this.hpFrame = image(ui, BossTexture.HP_FRAME, BossArt.HP_W, BossArt.HP_H, Z.HP);
    this.hpGhost = image(ui, BossTexture.HP_FILL, BossArt.HP_FILL_W, BossArt.HP_FILL_H, Z.HP + 0.1);
    this.hpFill = image(ui, BossTexture.HP_FILL, BossArt.HP_FILL_W, BossArt.HP_FILL_H, Z.HP + 0.2);
    this.hpFrame.setPosition(HP_X, HP_Y);
    this.hpGhost.setPosition(HP_X + BossArt.HP_FILL_X, HP_Y + BossArt.HP_FILL_Y).setAlpha(0.35);
    this.hpFill.setPosition(HP_X + BossArt.HP_FILL_X, HP_Y + BossArt.HP_FILL_Y);
    this.warning = image(ui, BossTexture.WARNING, BossArt.WARNING_W, BossArt.WARNING_H, Z.WARNING, 0.5, 0.5);
    this.warning.setPosition(480, WARNING.Y);
  }

  // ------------------------------------------------------------ events

  /** A boss sector starts: the WARNING banner (the sector banner shows under it). */
  intro(): void {
    this.warningMs = 0;
    this.defeatMs = -1;
    this.nextBurst = 0;
    this.finaleDone = false;
    this.ghost.value = 1;
  }

  /** The core took a hit (damage 0: it was still flashing). */
  hit(x: number, y: number, damage: number, weak: boolean): void {
    if (damage <= 0) {
      this.fx.spark(x, y, 3, COLOR.WHITE);
      return;
    }
    const color = PHASE_COLOR[this.phase];
    this.fx.shatter(x, y, weak ? 10 : 5, color);
    this.fx.spark(x, y, weak ? 8 : 4, weak ? COLOR.YELLOW : COLOR.WHITE);
    if (weak) {
      this.fx.flare(x, y, 110, 260, COLOR.YELLOW);
      this.fx.ring(x, y, 12, 90, 280, COLOR.YELLOW, 0.8);
    }
  }

  /** A new phase: the hull surges, the screen shakes, rings roll off it. */
  phaseChanged(phase: BossPhase, x: number, y: number): void {
    this.surgeMs = 420;
    const color = PHASE_COLOR[phase];
    this.fx.shake(260, 0.006);
    this.fx.ring(x, y, 60, 520, 620, color, 0.85);
    this.fx.ring(x, y, 30, 320, 460, COLOR.WHITE, 0.6);
    this.fx.flare(x, y, 260, 420, color);
    this.fx.shatter(x, y, 24, color);
  }

  /** 0 hp: the defeat sequence starts (sync plays it in real time). */
  defeated(x: number, y: number): void {
    this.defeatMs = 0;
    this.nextBurst = 0;
    this.finaleDone = false;
    this.fx.flare(x, y, 320, 500, COLOR.WHITE);
  }

  // ------------------------------------------------------------ frame

  sync(state: BreakerState, dtMs: number): void {
    this.clockMs += dtMs;
    this.syncWarning(dtMs);
    this.syncStun(state);

    const boss = state.boss;
    if (!boss) {
      if (this.shown) this.hideAll();
      return;
    }
    if (!this.shown) this.showAll();

    if (boss.phase !== this.phase) {
      this.phase = boss.phase;
      this.hull.setTexture(bossCoreKey(boss.phase));
      this.eye.setTexture(bossEyeKey(boss.phase));
    }

    let jitterX = 0;
    let jitterY = 0;
    let alpha = 1;
    if (!boss.alive) {
      if (this.defeatMs < 0) this.defeated(boss.x + boss.w / 2, boss.y + boss.h / 2);
      this.defeatMs += dtMs;
      this.playDefeat(boss.x, boss.y, boss.w, boss.h);
      const shake = this.finaleDone ? 0 : 3 + 5 * clamp01(this.defeatMs / DEFEAT.FINALE_MS);
      jitterX = (Math.random() - 0.5) * shake;
      jitterY = (Math.random() - 0.5) * shake;
      alpha = this.finaleDone ? 1 - clamp01((this.defeatMs - DEFEAT.FINALE_MS) / DEFEAT.FADE_MS) : 1;
    }

    const x = boss.x + jitterX;
    const y = boss.y + jitterY;
    const pad = BossArt.GLOW_PAD;
    this.hull.setPosition(x - pad, y - pad).setAlpha(alpha);
    this.rail.setPosition(0, boss.y + boss.h / 2).setAlpha(boss.alive ? 1 : 0.4 * alpha);

    const level = boss.alive ? bossCrackLevel(boss.hp, boss.maxHp) : 2;
    if (level !== this.crackLevel) {
      this.crackLevel = level;
      this.cracks.setVisible(level > 0);
      if (level > 0) this.cracks.setTexture(level === 2 ? BossTexture.CRACKS_2 : BossTexture.CRACKS_1);
    }
    if (level > 0) {
      // Damaged armor smolders: the cracks breathe.
      this.cracks.setPosition(x - pad, y - pad).setAlpha(alpha * (0.7 + 0.3 * Math.sin(this.clockMs / 140)));
    }

    // The hit flash comes from the engine's guard; a phase surge burns longer.
    if (this.surgeMs > 0) this.surgeMs = Math.max(0, this.surgeMs - dtMs);
    const flash = Math.max(clamp01(boss.invulnMs / BOSS.INVULN_MS) * 0.85, this.surgeMs / 420, boss.alive ? 0 : 0.5 * alpha);
    this.flash.setVisible(flash > 0.01);
    if (flash > 0.01) this.flash.setPosition(x - pad, y - pad).setAlpha(flash);

    // The eye: a slow pulse, swelling and brightening as the volley comes.
    const charge = boss.alive ? eyeCharge(boss.shotMs) : 0;
    const beat = 0.5 + 0.5 * Math.sin(this.clockMs / 240);
    this.eye
      .setVisible(boss.alive)
      .setPosition(x + boss.w / 2, y + BossArt.EYE_Y)
      .setAlpha(0.75 + 0.25 * Math.max(beat * 0.6, charge))
      .setDisplaySize(BossArt.EYE_W * (1 + 0.05 * beat + 0.22 * charge), BossArt.EYE_H * (1 + 0.05 * beat + 0.22 * charge));

    this.syncPellets(state);
    this.syncHp(boss.alive ? bossHpShare(boss.hp, boss.maxHp) : 0, dtMs, boss.alive ? 1 : alpha);
  }

  // ------------------------------------------------------------ pieces

  private syncPellets(state: BreakerState): void {
    const pellets = state.boss?.pellets;
    let n = 0;
    if (pellets) {
      for (let i = 0; i < pellets.length && n < this.pellets.length; i++) {
        const p = pellets[i];
        if (!p.alive) continue;
        const img = this.pellets[n++];
        const throb = 1 + 0.12 * Math.sin(this.clockMs / 60 + p.id);
        img
          .setVisible(true)
          .setPosition(lerp(p.prevX, p.x, state.alpha), lerp(p.prevY, p.y, state.alpha))
          .setRotation(this.clockMs / 90 + p.id)
          .setDisplaySize(BossArt.PELLET_SIZE * throb, BossArt.PELLET_SIZE * throb);
      }
    }
    for (let i = n; i < this.shownPellets; i++) this.pellets[i].setVisible(false);
    this.shownPellets = n;
  }

  private syncHp(share: number, dtMs: number, alpha: number): void {
    const fill = hpFillCropPx(share, BossArt.HP_FILL_W, TEXTURE_SCALE);
    if (fill !== this.fillPx) {
      this.fillPx = fill;
      this.hpFill.setVisible(fill > 0).setCrop(0, 0, fill, BossArt.HP_FILL_H * TEXTURE_SCALE);
    }
    const ghost = hpFillCropPx(this.ghost.update(share, dtMs), BossArt.HP_FILL_W, TEXTURE_SCALE);
    if (ghost !== this.ghostPx) {
      this.ghostPx = ghost;
      this.hpGhost.setVisible(ghost > 0).setCrop(0, 0, ghost, BossArt.HP_FILL_H * TEXTURE_SCALE);
    }
    this.hpFrame.setAlpha(alpha);
    this.hpFill.setAlpha(alpha);
    this.hpGhost.setAlpha(0.35 * alpha);
  }

  private syncWarning(dtMs: number): void {
    if (this.warningMs < 0) return;
    this.warningMs += dtMs;
    const look = warningLook(this.warningMs);
    if (!look.visible) {
      this.warning.setVisible(false);
      this.warningMs = -1;
      return;
    }
    this.warning
      .setVisible(true)
      .setAlpha(look.alpha)
      .setDisplaySize(BossArt.WARNING_W, BossArt.WARNING_H * Math.max(0.02, look.scaleY));
  }

  /** Arcs crackle over a jammed paddle. */
  private syncStun(state: BreakerState): void {
    const stunned = (state.paddleStunMs ?? 0) > 0;
    if (!stunned) {
      if (this.stunShown) {
        this.stunShown = false;
        this.stun.setVisible(false);
      }
      return;
    }
    this.stunShown = true;
    const p = state.paddle;
    this.stun
      .setVisible(true)
      .setPosition(lerp(p.prevX, p.x, state.alpha), p.y + p.h / 2)
      .setDisplaySize(p.w + 24, BossArt.STUN_H)
      .setFlip(Math.random() < 0.5, Math.random() < 0.5)
      .setAlpha(0.55 + 0.45 * Math.random());
  }

  /** Bursts across the hull, then the big one: the shards and rings come from the FxLayer. */
  private playDefeat(x: number, y: number, w: number, h: number): void {
    const bursts = DEFEAT.BURSTS_MS;
    while (this.nextBurst < bursts.length && this.defeatMs >= bursts[this.nextBurst]) {
      const k = this.nextBurst++;
      const bx = x + 20 + Math.random() * (w - 40);
      const by = y + 8 + Math.random() * (h - 16);
      const color = k % 2 === 0 ? COLOR.ORANGE : PHASE_COLOR[this.phase];
      this.fx.ring(bx, by, 16, 170, 420, color, 0.9);
      this.fx.flare(bx, by, 150, 320, COLOR.YELLOW);
      this.fx.shatter(bx, by, 12, color);
      this.fx.spark(bx, by, 6, COLOR.WHITE);
      this.fx.shake(140, 0.005);
    }
    if (!this.finaleDone && this.defeatMs >= DEFEAT.FINALE_MS) {
      this.finaleDone = true;
      const cx = x + w / 2;
      const cy = y + h / 2;
      this.fx.ring(cx, cy, 40, 980, 900, COLOR.WHITE, 0.95);
      this.fx.ring(cx, cy, 30, 700, 760, COLOR.MAGENTA, 0.85);
      this.fx.ring(cx, cy, 20, 460, 620, COLOR.CYAN, 0.8);
      this.fx.flare(cx, cy, 520, 700, COLOR.WHITE);
      this.fx.shatter(cx, cy, 36, COLOR.MAGENTA);
      this.fx.shatter(cx, cy, 36, COLOR.CYAN);
      this.fx.shatter(cx, cy, 24, COLOR.YELLOW);
      this.fx.shake(520, 0.012);
      this.fx.edgeFlash(COLOR.WHITE, 0.8);
    }
  }

  private showAll(): void {
    this.shown = true;
    this.crackLevel = -1;
    this.fillPx = -1;
    this.ghostPx = -1;
    this.phase = 1;
    this.surgeMs = 0;
    this.hull.setTexture(BossTexture.CORE_1).setVisible(true).setAlpha(1);
    this.eye.setTexture(BossTexture.EYE_1).setVisible(true);
    this.rail.setVisible(true);
    this.hpFrame.setVisible(true);
    this.hpFill.setVisible(true);
    this.hpGhost.setVisible(true);
  }

  private hideAll(): void {
    this.shown = false;
    this.defeatMs = -1;
    for (const img of [this.rail, this.hull, this.cracks, this.eye, this.flash, this.hpFrame, this.hpFill, this.hpGhost]) {
      img.setVisible(false);
    }
    for (let i = 0; i < this.shownPellets; i++) this.pellets[i].setVisible(false);
    this.shownPellets = 0;
  }
}
