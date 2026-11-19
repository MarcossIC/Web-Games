import * as Phaser from 'phaser';
import { themeAt } from '../assets/breaker-themes';
import { hexToNumber } from '../assets/color';
import { type WorldLayout, worldLayout } from '../engine/config';
import type { BreakerState } from '../engine/types';
import { type Board, DESKTOP_BOARD, viewMetrics } from './board-layout';
import { sectorLabel } from './hud-format';
import { inputHints } from './input-state';
import { addLabel } from './bitmap-fonts';
import { COLOR, CSS, DEPTH, FONT } from './scene-kit';
import type { SectorCardText } from './sector-card';
import { clamp01, easeOutBack, easeOutCubic, pulse } from './view-math';

const BANNER = { IN_MS: 360, HOLD_MS: 1000, OUT_MS: 340 } as const;
const CARD_W = 440;
const CARD_H = 262;
/** One value row of the card; the CORE row of a boss sector grows the card by it. */
const CARD_ROW = 32;
const CARD_IN_MS = 280;
const CARD_OUT_MS = 200;

type Text = Phaser.GameObjects.BitmapText;

/**
 * The big messages: SECTOR NN with the theme name as a sector starts, the
 * LAUNCH hint while a ball waits, and the SECTOR CLEARED card. All animated
 * by hand from elapsed time (no tween objects), drawn by the UI camera.
 * Every label is a BitmapText: changing one uploads no texture.
 */
export class Banners {
  private readonly title: Text;
  private readonly subtitle: Text;
  private readonly lineL: Phaser.GameObjects.Rectangle;
  private readonly lineR: Phaser.GameObjects.Rectangle;
  private bannerMs = -1;
  /** Banner center y, and how much bigger everything but the hint is (tall boards). */
  private readonly bannerY: number;
  private readonly k: number;

  private readonly hint: Text;
  private touch = false;

  private readonly card: Phaser.GameObjects.Container;
  private readonly cardPanel: Phaser.GameObjects.Graphics;
  private readonly cardTitle: Text;
  private readonly cardNoMiss: Text;
  private readonly cardValues: Text[] = [];
  private readonly cardNew: Text;
  private readonly cardCoreLabel: Text;
  private readonly cardCore: Text;
  private readonly cardFooter: Text;
  /** Every part but the panel, with the y it has on a card without the CORE row. */
  private readonly cardLayout: { part: Text; y: number }[] = [];
  private cardMs = -1;
  private cardOutMs = -1;
  private clockMs = 0;

  constructor(scene: Phaser.Scene, ui: Phaser.GameObjects.Layer, board: Board = DESKTOP_BOARD, layout: WorldLayout = worldLayout()) {
    const cx = scene.scale.width / 2;
    const m = viewMetrics(board, layout);
    const k = m.bannerScale;
    this.k = k;
    this.bannerY = m.bannerY;
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      ui.add(obj);
      return obj;
    };

    const center = { originX: 0.5, originY: 0.5 };
    this.title = add(
      addLabel(scene, cx, m.bannerY, '', FONT.DISPLAY, 56 * k, CSS.TEXT, center)
        .setDropShadow(0, 4 * k, COLOR.INK, 1)
        .setDepth(DEPTH.BANNERS)
        .setVisible(false)
    );
    this.subtitle = add(
      addLabel(scene, cx, m.bannerY + 46 * k, '', FONT.PIXEL, 16 * k, CSS.CYAN, { ...center, spacing: 6 * k })
        .setDepth(DEPTH.BANNERS)
        .setVisible(false)
    );
    this.lineL = add(scene.add.rectangle(cx - 20 * k, m.bannerY + 46 * k, 150 * k, 2 * k, COLOR.CYAN).setOrigin(1, 0.5).setDepth(DEPTH.BANNERS).setVisible(false));
    this.lineR = add(scene.add.rectangle(cx + 20 * k, m.bannerY + 46 * k, 150 * k, 2 * k, COLOR.CYAN).setOrigin(0, 0.5).setDepth(DEPTH.BANNERS).setVisible(false));

    this.hint = add(
      addLabel(scene, cx, m.hintY, 'CLICK OR SPACE TO LAUNCH', FONT.PIXEL, 13 * m.hintScale, CSS.CYAN, { ...center, spacing: 3 * m.hintScale })
        .setDepth(DEPTH.BANNERS)
        .setVisible(false)
    );

    this.cardPanel = scene.add.graphics();
    this.cardTitle = addLabel(scene, 0, -96, '', FONT.DISPLAY, 28, CSS.TEXT, center);
    this.cardNoMiss = addLabel(scene, 0, -62, '', FONT.PIXEL, 12, CSS.GREEN, { ...center, spacing: 3 });
    const parts: Phaser.GameObjects.GameObject[] = [this.cardPanel, this.cardTitle, this.cardNoMiss];
    const labels = ['TIME', 'PAR', 'BONUS', 'BEST'];
    for (let i = 0; i < labels.length; i++) {
      const y = -30 + i * 32;
      parts.push(addLabel(scene, -170, y, labels[i], FONT.PIXEL, 13, CSS.DIM, { originY: 0.5, spacing: 2 }));
      const value = addLabel(scene, 130, y, '', FONT.DISPLAY, 18, CSS.TEXT, { originX: 1, originY: 0.5 });
      this.cardValues.push(value);
      parts.push(value);
    }
    this.cardNew = addLabel(scene, 142, -30 + 3 * 32, 'NEW', FONT.PIXEL, 13, CSS.YELLOW, { originY: 0.5 });
    // The core's share of the bonus, shown on boss sectors only.
    const coreY = -30 + labels.length * CARD_ROW;
    this.cardCoreLabel = addLabel(scene, -170, coreY, 'CORE', FONT.PIXEL, 13, CSS.DIM, { originY: 0.5, spacing: 2 }).setVisible(false);
    this.cardCore = addLabel(scene, 130, coreY, '', FONT.DISPLAY, 18, CSS.MAGENTA, { originX: 1, originY: 0.5 }).setVisible(false);
    this.cardFooter = addLabel(scene, 0, 100, 'CLICK OR SPACE TO CONTINUE', FONT.PIXEL, 11, CSS.DIM, { ...center, spacing: 2 });
    parts.push(this.cardNew, this.cardCoreLabel, this.cardCore, this.cardFooter);
    for (const part of parts) if (part !== this.cardPanel) this.cardLayout.push({ part: part as Text, y: (part as Text).y });
    this.card = add(scene.add.container(cx, m.cardY, parts).setDepth(DEPTH.BANNERS).setVisible(false));
  }

  get cardUp(): boolean {
    return this.cardMs >= 0 && this.cardOutMs < 0;
  }

  /** ms since the card showed; -1 when it is not up. */
  get cardElapsedMs(): number {
    return this.cardUp ? this.cardMs : -1;
  }

  setTouch(touch: boolean): void {
    if (touch === this.touch) return;
    this.touch = touch;
    const hints = inputHints(touch);
    this.hint.setText(hints.launch);
    this.cardFooter.setText(hints.cardFooter);
  }

  showSector(sector: number, theme: number): void {
    const look = themeAt(theme);
    const accent = hexToNumber(look.accent);
    this.title.setText(sectorLabel(sector));
    this.subtitle.setText(look.name.toUpperCase()).setTint(accent);
    this.lineL.setFillStyle(accent);
    this.lineR.setFillStyle(accent);
    this.bannerMs = 0;
  }

  showCard(text: SectorCardText, theme: number): void {
    const accent = hexToNumber(themeAt(theme).accent);
    const core = text.core !== '';
    // A boss sector adds the CORE row: the card grows by a row, and the
    // content moves up half a row so it stays centered.
    const extra = core ? CARD_ROW : 0;
    const h = CARD_H + extra;
    const shift = -extra / 2;
    for (const { part, y } of this.cardLayout) {
      // The footer sits under the CORE row; the rows above it only move up.
      part.setY(y + shift + (part === this.cardFooter ? extra : 0));
    }
    const g = this.cardPanel;
    g.clear();
    g.fillStyle(COLOR.PANEL, 0.94);
    g.fillRoundedRect(-CARD_W / 2, -h / 2, CARD_W, h, 10);
    g.lineStyle(2, accent, 1);
    g.strokeRoundedRect(-CARD_W / 2, -h / 2, CARD_W, h, 10);
    g.lineStyle(1, COLOR.LINE, 1);
    g.lineBetween(-CARD_W / 2 + 24, -44 + shift, CARD_W / 2 - 24, -44 + shift);
    g.lineBetween(-CARD_W / 2 + 24, 80 + shift + extra, CARD_W / 2 - 24, 80 + shift + extra);

    this.cardTitle.setText(text.title);
    this.cardNoMiss.setText(text.noMiss);
    this.cardValues[0].setText(text.time);
    this.cardValues[1].setText(text.par.replace('PAR ', ''));
    this.cardValues[2].setText(text.bonus);
    this.cardValues[3].setText(text.best.replace('BEST ', ''));
    this.cardNew.setVisible(text.isNewBest);
    this.cardCoreLabel.setVisible(core);
    this.cardCore.setVisible(core).setText(text.core.replace('CORE ', ''));
    this.cardMs = 0;
    this.cardOutMs = -1;
    this.card.setVisible(true).setAlpha(0).setScale(0.92 * this.k);
  }

  hideCard(): void {
    if (this.cardUp) this.cardOutMs = 0;
  }

  /** Drop everything at once (a restart, a new run). */
  clear(): void {
    this.bannerMs = -1;
    this.cardMs = this.cardOutMs = -1;
    this.title.setVisible(false);
    this.subtitle.setVisible(false);
    this.lineL.setVisible(false);
    this.lineR.setVisible(false);
    this.card.setVisible(false);
    this.hint.setVisible(false);
  }

  sync(state: BreakerState, dtMs: number): void {
    this.clockMs += dtMs;
    this.syncBanner(dtMs);
    this.syncCard(dtMs);
    const waiting = state.phase === 'serve' && this.cardMs < 0;
    if (waiting) this.hint.setVisible(true).setAlpha(0.4 + 0.6 * pulse(this.clockMs, 1300));
    else if (this.hint.visible) this.hint.setVisible(false);
  }

  private syncBanner(dtMs: number): void {
    if (this.bannerMs < 0) return;
    this.bannerMs += dtMs;
    const t = this.bannerMs;
    let alpha: number;
    let scale = 1;
    let rise = 0;
    let line: number;
    if (t < BANNER.IN_MS) {
      const k = t / BANNER.IN_MS;
      alpha = easeOutCubic(k);
      scale = 1.25 - 0.25 * easeOutBack(k);
      line = easeOutCubic(k);
    } else if (t < BANNER.IN_MS + BANNER.HOLD_MS) {
      alpha = 1;
      line = 1;
    } else {
      const k = clamp01((t - BANNER.IN_MS - BANNER.HOLD_MS) / BANNER.OUT_MS);
      alpha = 1 - k;
      rise = -16 * this.k * easeOutCubic(k);
      line = 1 - k;
      if (k >= 1) {
        this.bannerMs = -1;
        this.title.setVisible(false);
        this.subtitle.setVisible(false);
        this.lineL.setVisible(false);
        this.lineR.setVisible(false);
        return;
      }
    }
    this.title.setVisible(true).setAlpha(alpha).setScale(scale).setY(this.bannerY + rise);
    this.subtitle.setVisible(true).setAlpha(alpha).setY(this.bannerY + 46 * this.k + rise);
    const half = this.subtitle.displayWidth / 2 + 16 * this.k;
    const w = Math.max(0.01, line);
    this.lineL.setVisible(true).setAlpha(alpha).setPosition(this.title.x - half, this.bannerY + 46 * this.k + rise).setScale(w, 1);
    this.lineR.setVisible(true).setAlpha(alpha).setPosition(this.title.x + half, this.bannerY + 46 * this.k + rise).setScale(w, 1);
  }

  private syncCard(dtMs: number): void {
    if (this.cardMs < 0) return;
    this.cardMs += dtMs;
    if (this.cardOutMs >= 0) {
      this.cardOutMs += dtMs;
      const k = clamp01(this.cardOutMs / CARD_OUT_MS);
      this.card.setAlpha(1 - k).setScale((1 + 0.04 * k) * this.k);
      if (k >= 1) {
        this.cardMs = this.cardOutMs = -1;
        this.card.setVisible(false);
      }
      return;
    }
    const k = clamp01(this.cardMs / CARD_IN_MS);
    this.card.setAlpha(easeOutCubic(k)).setScale((0.92 + 0.08 * easeOutBack(k)) * this.k);
    if (this.cardNew.visible) this.cardNew.setAlpha(0.5 + 0.5 * pulse(this.clockMs, 600));
  }
}
