import * as Phaser from 'phaser';
import { BrickArt, BreakerTexture } from '@app/data/models/breaker/BreakerKeys';
import { GRID } from '../engine/config';
import type { Brick, BreakerState } from '../engine/types';
import { brickBaseTexture, brickOverlays, flashAlpha } from './looks';
import { Pool } from './pool';
import { DEPTH } from './scene-kit';
import { clamp01, easeOutBack } from './view-math';

type Image = Phaser.GameObjects.Image;

interface BrickSlot {
  id: number;
  base: Image | null;
  plate: Image | null;
  crack: Image | null;
  flash: Image | null;
  x: number;
  y: number;
  hp: number;
  /** ms before the brick starts its entrance. */
  delay: number;
}

const MAX_BRICKS = GRID.COLS * GRID.MAX_ROWS;
const MAX_FLASHES = 64;
const INTRO = { STAGGER_ROW_MS: 45, STAGGER_COL_MS: 12, MS: 320, DROP: 26 } as const;

/**
 * One Image per brick, plus a damage overlay only on a damaged brick and a
 * flash only while it flashes, all from pools built in the constructor.
 *
 * The engine's `bricks` is a new array each sector (rebuilt here once) and
 * is compacted in place within a sector, so slots are found by brick id.
 * Per frame only bricks that moved, changed hp or flash are touched.
 */
export class BrickLayer {
  private readonly bases: Pool<Image>;
  /** Two pools with a fixed depth each, so dressing a brick never re-sorts the layer. */
  private readonly plates: Pool<Image>;
  private readonly cracks: Pool<Image>;
  private readonly flashes: Pool<Image>;
  private readonly slots: BrickSlot[] = [];
  private readonly byId = new Map<number, BrickSlot>();
  private bricksRef: readonly Readonly<Brick>[] | null = null;
  private introMs = 0;
  private introTotalMs = 0;
  private introPending = false;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    const make = (key: string, depth: number) => (): Image => {
      const image = scene.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(BrickArt.WIDTH, BrickArt.HEIGHT);
      image.setDepth(depth).setVisible(false);
      layer.add(image);
      return image;
    };
    const hide = (image: Image) => image.setVisible(false);
    const show = (image: Image) => image.setVisible(true).setAlpha(1);
    this.bases = new Pool(MAX_BRICKS, make(BreakerTexture.STEEL, DEPTH.BRICKS), show, hide);
    this.plates = new Pool(MAX_BRICKS, make(BreakerTexture.ARMOR_PLATE, DEPTH.BRICK_OVERLAY), show, hide);
    this.cracks = new Pool(MAX_BRICKS, make(BreakerTexture.CRACK_1, DEPTH.BRICK_OVERLAY + 0.5), show, hide);
    this.flashes = new Pool(MAX_FLASHES, make(BreakerTexture.BRICK_FLASH, DEPTH.BRICK_FLASH), show, hide);
    for (let i = 0; i < MAX_BRICKS; i++) {
      this.slots.push({ id: -1, base: null, plate: null, crack: null, flash: null, x: 0, y: 0, hp: 0, delay: 0 });
    }
  }

  /** Bricks alive now. */
  get count(): number {
    return this.byId.size;
  }

  /**
   * The formation drops in (on sector-started). Works whether the bricks of
   * the sector were already drawn (the first sector, drawn behind the How to
   * play sheet) or get built on the next sync (nextSector).
   */
  playIntro(): void {
    this.introPending = true;
  }

  sync(state: BreakerState, dtMs: number): void {
    if (state.bricks !== this.bricksRef) this.rebuild(state);
    if (this.introPending) {
      this.introPending = false;
      this.introMs = 0;
    }
    const intro = this.introMs < this.introTotalMs;
    if (intro) this.introMs += dtMs;

    const bricks = state.bricks;
    for (let i = 0; i < bricks.length; i++) {
      const brick = bricks[i];
      if (!brick.alive) continue;
      const slot = this.byId.get(brick.id);
      if (!slot || !slot.base) continue;

      if (intro) {
        this.placeIntro(slot, brick);
      } else if (brick.x !== slot.x || brick.y !== slot.y) {
        this.place(slot, brick.x, brick.y, 1);
      }
      if (brick.hp !== slot.hp) {
        slot.hp = brick.hp;
        this.dress(slot, brick);
      }
      if (brick.flashMs > 0) {
        if (!slot.flash) {
          slot.flash = this.flashes.acquire();
          slot.flash?.setPosition(slot.x, slot.y);
        }
        slot.flash?.setAlpha(flashAlpha(brick.flashMs));
      } else if (slot.flash) {
        this.flashes.release(slot.flash);
        slot.flash = null;
      }
    }
  }

  /** A brick broke (event): its images go back to the pools at once. */
  destroyed(brickId: number): void {
    const slot = this.byId.get(brickId);
    if (!slot) return;
    this.free(slot);
    this.byId.delete(brickId);
  }

  /**
   * A brick that appeared mid-sector (a shield of the core grew back, event
   * `shield-restored`): it gets a free slot and its images now. Rare: once
   * every few seconds at most, so the slot search is a plain scan.
   */
  adopt(brick: Readonly<Brick>, theme: number): void {
    if (!brick.alive || this.byId.has(brick.id)) return;
    let slot: BrickSlot | null = null;
    for (let i = 0; i < this.slots.length && !slot; i++) if (this.slots[i].id === -1) slot = this.slots[i];
    if (!slot) return;
    slot.base = this.bases.acquire();
    if (!slot.base) return;
    slot.id = brick.id;
    slot.base.setTexture(brickBaseTexture(brick.kind, theme, brick.tone));
    slot.hp = brick.hp;
    slot.delay = 0;
    this.dress(slot, brick);
    this.place(slot, brick.x, brick.y, 1);
    this.byId.set(brick.id, slot);
  }

  private rebuild(state: BreakerState): void {
    this.bricksRef = state.bricks;
    for (const slot of this.slots) this.free(slot);
    this.byId.clear();
    this.bases.releaseAll();
    this.plates.releaseAll();
    this.cracks.releaseAll();
    this.flashes.releaseAll();

    const bricks = state.bricks;
    let maxDelay = 0;
    for (let i = 0; i < bricks.length && i < this.slots.length; i++) {
      const brick = bricks[i];
      if (!brick.alive) continue;
      const slot = this.slots[i];
      slot.id = brick.id;
      slot.base = this.bases.acquire();
      slot.base?.setTexture(brickBaseTexture(brick.kind, state.theme, brick.tone));
      slot.hp = brick.hp;
      slot.delay = brick.row * INTRO.STAGGER_ROW_MS + Math.abs(brick.col - (GRID.COLS - 1) / 2) * INTRO.STAGGER_COL_MS;
      maxDelay = Math.max(maxDelay, slot.delay);
      this.dress(slot, brick);
      this.place(slot, brick.x, brick.y, 1);
      this.byId.set(brick.id, slot);
    }
    this.introTotalMs = maxDelay + INTRO.MS;
    // Built in place; playIntro() asks for the drop-in.
    this.introMs = this.introTotalMs;
  }

  /** The formation drops in row by row, from the center out, when a sector starts. */
  private placeIntro(slot: BrickSlot, brick: Readonly<Brick>): void {
    const t = clamp01((this.introMs - slot.delay) / INTRO.MS);
    const offset = (1 - easeOutBack(t)) * -INTRO.DROP;
    // At t = 1 the offset is 0 and alpha 1: the brick ends exactly in place.
    this.place(slot, brick.x, brick.y + offset, t);
  }

  private place(slot: BrickSlot, x: number, y: number, alpha: number): void {
    slot.x = x;
    slot.y = y;
    slot.base?.setPosition(x, y).setAlpha(alpha);
    slot.plate?.setPosition(x, y).setAlpha(alpha);
    slot.crack?.setPosition(x, y).setAlpha(alpha);
    slot.flash?.setPosition(x, y);
  }

  /** Puts on (or takes off) the plate and crack overlays for the brick's hp. */
  private dress(slot: BrickSlot, brick: Readonly<Brick>): void {
    const look = brickOverlays(brick.kind, brick.hp);
    if (look.plate && !slot.plate) {
      slot.plate = this.plates.acquire();
      slot.plate?.setPosition(slot.x, slot.y);
    } else if (!look.plate && slot.plate) {
      this.plates.release(slot.plate);
      slot.plate = null;
    }
    if (look.crack) {
      if (!slot.crack) slot.crack = this.cracks.acquire();
      slot.crack?.setTexture(look.crack).setPosition(slot.x, slot.y);
    } else if (slot.crack) {
      this.cracks.release(slot.crack);
      slot.crack = null;
    }
  }

  private free(slot: BrickSlot): void {
    if (slot.base) this.bases.release(slot.base);
    if (slot.plate) this.plates.release(slot.plate);
    if (slot.crack) this.cracks.release(slot.crack);
    if (slot.flash) this.flashes.release(slot.flash);
    slot.base = slot.plate = slot.crack = slot.flash = null;
    slot.id = -1;
  }
}
