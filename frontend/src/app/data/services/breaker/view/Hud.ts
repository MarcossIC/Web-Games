import * as Phaser from 'phaser';
import {
  BREAKER_TIMED_EFFECTS,
  BreakerTexture,
  effectIconKey,
  HudArt,
  TEXTURE_SCALE,
} from '@app/data/models/breaker/BreakerKeys';
import { CAPSULE_STYLES, themeAt } from '../assets/breaker-themes';
import { hexToNumber } from '../assets/color';
import { LIVES, OVERDRIVE } from '../engine/config';
import { formatTime } from '../engine/records';
import { SCORE } from '../engine/scoring';
import type { BreakerState, TimedEffectKind } from '../engine/types';
import { comboLabel, effectRatio, formatMultiplier, formatScore, paceLabel, sectorLabel } from './hud-format';
import { addLabel } from './bitmap-fonts';
import { inputHints } from './input-state';
import { COLOR, CSS, DEPTH, FONT } from './scene-kit';
import { clamp01, easeOutBack, pulse } from './view-math';

type Text = Phaser.GameObjects.BitmapText;
type Image = Phaser.GameObjects.Image;

const METER_X = 590;
const METER_Y = 22;
const CLOCK_X = 420;
/** The clock shows hundredths; re-rendering its text every frame is not worth it. */
const CLOCK_EVERY_MS = 40;
const EFFECT_SLOT_W = 84;
const EFFECT_Y = 702;
const EFFECT_BAR_W = 46;
const COMBO_X = 944;
const COMBO_BAR_W = 120;

const TINT = {
  DIM: hexToNumber(CSS.DIM),
  RED: hexToNumber(CSS.RED),
  MAGENTA: hexToNumber(CSS.MAGENTA),
} as const;

const EFFECT_COLOR = Object.fromEntries(
  BREAKER_TIMED_EFFECTS.map((kind) => [kind, hexToNumber(CAPSULE_STYLES[kind].color)])
) as Record<TimedEffectKind, number>;

interface EffectSlot {
  icon: Image;
  back: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  kind: TimedEffectKind | null;
}

/**
 * The HUD band (0..64) and the two corner read-outs: effect timers bottom
 * left, the combo counter bottom right (below the paddle, where the ball
 * never needs reading). Every label is a BitmapText (no texture upload when
 * it changes) and changes with setText only when the value it shows changed.
 */
export class Hud {
  private readonly score: Text;
  private readonly multiplier: Text;
  private readonly sector: Text;
  private readonly clock: Text;
  private readonly pace: Text;
  private readonly best: Text;
  private readonly lives: Image[] = [];
  private readonly meterFrame: Image;
  private readonly meterFill: Image;
  private readonly meterLabel: Text;
  private readonly novaHint: Text;
  private readonly effects: EffectSlot[] = [];
  private readonly combo: Text;
  private readonly comboMult: Text;
  private readonly comboBar: Phaser.GameObjects.Rectangle;
  private readonly fps: Text | null;

  private shownScore = -1;
  private shownMultiplier = -1;
  private shownSector = -1;
  private shownLives = -1;
  private shownBest = -1;
  private shownMeter = -1;
  private shownCombo = -1;
  private shownComboMult = -1;
  private meterMode: 'charge' | 'ready' | 'nova' | '' = '';
  private clockAt = -Infinity;
  private overPar = false;
  private clockMs = 0;
  private comboPopMs = 1e9;
  private comboDropMs = -1;
  private livesPopMs = 1e9;
  private fpsAt = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    ui: Phaser.GameObjects.Layer,
    bestScore: number,
    showFps: boolean
  ) {
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      ui.add(obj);
      return obj;
    };
    const text = (x: number, y: number, value: string, font: string, size: number, color: string, ox = 0, oy = 0, spacing = 0) =>
      add(addLabel(scene, x, y, value, font, size, color, { originX: ox, originY: oy, spacing }).setDepth(DEPTH.HUD_TEXT));

    add(
      scene.add
        .image(0, 0, BreakerTexture.HUD_PANEL)
        .setOrigin(0, 0)
        .setDisplaySize(HudArt.PANEL_WIDTH, HudArt.PANEL_HEIGHT)
        .setDepth(DEPTH.HUD)
    );

    text(24, 7, 'SCORE', FONT.PIXEL, 11, CSS.DIM, 0, 0, 2);
    this.score = text(24, 17, '0', FONT.DISPLAY, 22, CSS.TEXT);
    this.multiplier = text(24, 42, 'x1.0', FONT.PIXEL, 11, CSS.YELLOW);

    this.sector = text(CLOCK_X, 6, '', FONT.PIXEL, 11, CSS.CYAN, 0.5, 0, 1);
    this.clock = text(CLOCK_X, 17, '0:00.00', FONT.DISPLAY, 20, CSS.TEXT, 0.5);
    this.pace = text(CLOCK_X, 42, '', FONT.PIXEL, 10, CSS.DIM, 0.5);

    this.meterLabel = text(METER_X, 7, 'OVERDRIVE', FONT.PIXEL, 10, CSS.DIM, 0, 0, 2);
    this.meterFrame = add(
      scene.add
        .image(METER_X, METER_Y, BreakerTexture.METER_FRAME)
        .setOrigin(0, 0)
        .setDisplaySize(HudArt.METER_WIDTH, HudArt.METER_HEIGHT)
        .setDepth(DEPTH.HUD_TEXT)
    );
    this.meterFill = add(
      scene.add
        .image(METER_X + HudArt.FILL_INSET, METER_Y + HudArt.FILL_INSET, BreakerTexture.METER_FILL)
        .setOrigin(0, 0)
        .setDisplaySize(HudArt.FILL_WIDTH, HudArt.FILL_HEIGHT)
        .setDepth(DEPTH.HUD_TEXT + 0.5)
    );
    this.novaHint = text(METER_X + HudArt.METER_WIDTH / 2, 42, 'SHIFT · NOVA', FONT.PIXEL, 10, CSS.YELLOW, 0.5, 0, 1).setVisible(false);

    text(936, 7, 'BEST', FONT.PIXEL, 11, CSS.DIM, 1, 0, 2);
    this.best = text(936, 17, formatScore(bestScore), FONT.DISPLAY, 22, CSS.TEXT, 1);
    this.shownBest = bestScore;
    for (let i = 0; i < LIVES.MAX; i++) {
      this.lives.push(
        add(
          scene.add
            .image(936 - HudArt.LIFE_WIDTH / 2 - i * (HudArt.LIFE_WIDTH + 4), 48, BreakerTexture.HUD_LIFE)
            .setDisplaySize(HudArt.LIFE_WIDTH, HudArt.LIFE_HEIGHT)
            .setDepth(DEPTH.HUD_TEXT)
            .setVisible(false)
        )
      );
    }

    for (let i = 0; i < BREAKER_TIMED_EFFECTS.length; i++) {
      const x = 22 + i * EFFECT_SLOT_W;
      const icon = add(
        scene.add
          .image(x, EFFECT_Y, effectIconKey('wide'))
          .setDisplaySize(HudArt.EFFECT_ICON_SIZE, HudArt.EFFECT_ICON_SIZE)
          .setDepth(DEPTH.HUD)
          .setVisible(false)
      );
      const back = add(
        scene.add.rectangle(x + 16, EFFECT_Y, EFFECT_BAR_W, 5, COLOR.LINE).setOrigin(0, 0.5).setDepth(DEPTH.HUD).setVisible(false)
      );
      const fill = add(
        scene.add.rectangle(x + 16, EFFECT_Y, EFFECT_BAR_W, 5, COLOR.CYAN).setOrigin(0, 0.5).setDepth(DEPTH.HUD_TEXT).setVisible(false)
      );
      this.effects.push({ icon, back, fill, kind: null });
    }

    this.comboMult = text(COMBO_X, 686, '', FONT.PIXEL, 12, CSS.YELLOW, 1, 1).setVisible(false);
    this.combo = text(COMBO_X, 712, '', FONT.DISPLAY, 20, CSS.TEXT, 1, 1).setVisible(false);
    this.comboBar = add(
      scene.add.rectangle(COMBO_X, 716, COMBO_BAR_W, 3, COLOR.YELLOW).setOrigin(1, 0.5).setDepth(DEPTH.HUD).setVisible(false)
    );

    this.fps = showFps ? text(8, 70, '', FONT.PIXEL, 10, CSS.GREEN) : null;
  }

  /** A brick broke: the combo counter pops. */
  comboHit(): void {
    this.comboPopMs = 0;
    this.comboDropMs = -1;
  }

  /** The combo ran out: the counter falls away. */
  comboLost(): void {
    if (this.shownCombo >= 2) this.comboDropMs = 0;
  }

  livesChanged(): void {
    this.livesPopMs = 0;
  }

  /** The Nova hint names the gesture of the device in use. */
  setTouch(touch: boolean): void {
    this.novaHint.setText(inputHints(touch).nova);
  }

  sync(state: BreakerState, dtMs: number, nowMs: number): void {
    this.clockMs += dtMs;
    if (state.score !== this.shownScore) {
      this.shownScore = state.score;
      this.score.setText(formatScore(state.score));
      if (state.score > this.shownBest) {
        this.shownBest = state.score;
        this.best.setText(formatScore(state.score));
      }
    }
    if (state.multiplier !== this.shownMultiplier) {
      this.shownMultiplier = state.multiplier;
      this.multiplier.setText(formatMultiplier(state.multiplier));
    }
    if (state.sector !== this.shownSector) {
      this.shownSector = state.sector;
      this.sector.setText(`${sectorLabel(state.sector)} · ${themeAt(state.theme).name.toUpperCase()}`);
    }
    if (nowMs - this.clockAt >= CLOCK_EVERY_MS) {
      this.clockAt = nowMs;
      this.clock.setText(formatTime(state.runTimeMs));
      this.pace.setText(paceLabel(state.sectorTimeMs, state.parTimeMs));
      const overPar = state.sectorTimeMs > state.parTimeMs;
      if (overPar !== this.overPar) {
        this.overPar = overPar;
        this.pace.setTint(overPar ? TINT.RED : TINT.DIM);
      }
    }
    this.syncLives(state, dtMs);
    this.syncMeter(state);
    this.syncEffects(state);
    this.syncCombo(state, dtMs);
    if (this.fps && nowMs - this.fpsAt > 250) {
      this.fpsAt = nowMs;
      this.fps.setText(`${Math.round(this.scene.game.loop.actualFps)} FPS`);
    }
  }

  private syncLives(state: BreakerState, dtMs: number): void {
    const lives = Math.min(LIVES.MAX, state.lives);
    if (lives !== this.shownLives) {
      for (let i = 0; i < this.lives.length; i++) this.lives[i].setVisible(i < lives);
      this.shownLives = lives;
    }
    if (this.livesPopMs < 400) {
      this.livesPopMs += dtMs;
      const k = 1 + 0.5 * (1 - easeOutBack(clamp01(this.livesPopMs / 400)));
      const newest = this.lives[Math.max(0, lives - 1)];
      newest.setDisplaySize(HudArt.LIFE_WIDTH * k, HudArt.LIFE_HEIGHT * k);
    }
  }

  private syncMeter(state: BreakerState): void {
    const nova = state.novaRemainingMs > 0;
    const ratio = nova ? clamp01(state.novaRemainingMs / OVERDRIVE.NOVA_MS) : clamp01(state.overdrive);
    const mode = nova ? 'nova' : ratio >= 1 ? 'ready' : 'charge';
    if (mode !== this.meterMode) {
      this.meterMode = mode;
      this.meterLabel.setText(mode === 'nova' ? 'NOVA' : 'OVERDRIVE').setTint(mode === 'nova' ? TINT.MAGENTA : TINT.DIM);
      this.novaHint.setVisible(mode === 'ready');
      if (mode === 'nova') this.meterFill.setTint(COLOR.MAGENTA);
      else this.meterFill.clearTint();
      if (mode !== 'ready') {
        this.meterFrame.setAlpha(1);
        this.meterFill.setAlpha(1);
      }
    }
    // Crop in texture pixels; only when a whole pixel changes.
    const px = Math.round(HudArt.FILL_WIDTH * TEXTURE_SCALE * ratio);
    if (px !== this.shownMeter) {
      this.shownMeter = px;
      this.meterFill.setVisible(px > 0).setCrop(0, 0, px, HudArt.FILL_HEIGHT * TEXTURE_SCALE);
    }
    if (mode === 'ready') {
      const beat = pulse(this.clockMs, 700);
      this.meterFill.setAlpha(0.65 + 0.35 * beat);
      this.meterFrame.setAlpha(0.8 + 0.2 * beat);
      this.novaHint.setAlpha(0.55 + 0.45 * beat);
    }
  }

  private syncEffects(state: BreakerState): void {
    const effects = state.effects;
    for (let i = 0; i < this.effects.length; i++) {
      const slot = this.effects[i];
      const effect = i < effects.length ? effects[i] : null;
      if (!effect) {
        if (slot.kind !== null) {
          slot.kind = null;
          slot.icon.setVisible(false);
          slot.back.setVisible(false);
          slot.fill.setVisible(false);
        }
        continue;
      }
      if (slot.kind !== effect.kind) {
        slot.kind = effect.kind;
        slot.icon.setTexture(effectIconKey(effect.kind)).setVisible(true);
        slot.back.setVisible(true);
        slot.fill.setFillStyle(EFFECT_COLOR[effect.kind]).setVisible(true);
      }
      const ratio = effectRatio(effect.remainingMs, effect.durationMs);
      slot.fill.setScale(ratio, 1);
      // The last fifth blinks: it is about to go.
      const alpha = ratio < 0.2 && pulse(this.clockMs, 300) > 0.5 ? 0.35 : 1;
      slot.icon.setAlpha(alpha);
      slot.fill.setAlpha(alpha);
    }
  }

  private syncCombo(state: BreakerState, dtMs: number): void {
    const combo = state.combo;
    if (combo >= 2) {
      const reshow = this.comboDropMs >= 0;
      this.comboDropMs = -1;
      if (combo !== this.shownCombo || reshow) {
        this.combo.setText(comboLabel(combo)).setVisible(true).setAlpha(1).setY(712);
        this.comboMult.setVisible(true).setAlpha(1);
        this.comboBar.setVisible(true);
      }
      // Nova doubles the multiplier without a new brick: follow it on its own.
      if (state.multiplier !== this.shownComboMult || reshow) {
        this.shownComboMult = state.multiplier;
        this.comboMult.setText(formatMultiplier(state.multiplier));
      }
      this.shownCombo = combo;
      if (this.comboPopMs < 220) {
        this.comboPopMs += dtMs * state.timeScale;
        const k = 1 + 0.4 * (1 - easeOutBack(clamp01(this.comboPopMs / 220)));
        this.combo.setScale(k);
      }
      this.comboBar.setScale(clamp01(state.comboRemainingMs / SCORE.COMBO_WINDOW_MS), 1);
      return;
    }
    this.shownCombo = combo;
    if (this.comboDropMs >= 0) {
      // The counter falls away and fades.
      this.comboDropMs += dtMs;
      const t = clamp01(this.comboDropMs / 450);
      this.combo.setY(712 + t * t * 24).setAlpha(1 - t);
      this.comboMult.setAlpha(1 - t);
      this.comboBar.setVisible(false);
      if (t >= 1) {
        this.comboDropMs = -1;
        this.hideCombo();
      }
    } else if (this.combo.visible) {
      this.hideCombo();
    }
  }

  private hideCombo(): void {
    this.combo.setVisible(false).setScale(1).setY(712);
    this.comboMult.setVisible(false);
    this.comboBar.setVisible(false);
  }
}
