import * as Phaser from 'phaser';
import { BreakerTexture, CapsuleArt, capsuleTextureKey } from '@app/data/models/breaker/BreakerKeys';
import { CAPSULE_STYLES } from '../assets/breaker-themes';
import { hexToNumber } from '../assets/color';
import { CAPSULE } from '../engine/config';
import type { BreakerState, PowerUpKind } from '../engine/types';
import { DEPTH } from './scene-kit';
import { lerp } from './view-math';

type Image = Phaser.GameObjects.Image;

const SLOTS = CAPSULE.MAX_FALLING + 2;

interface CapsuleSlot {
  pill: Image;
  glow: Image;
  kind: PowerUpKind | null;
}

const GLOW_TINT: Readonly<Record<PowerUpKind, number>> = Object.fromEntries(
  Object.entries(CAPSULE_STYLES).map(([kind, style]) => [kind, hexToNumber(style.color)])
) as Record<PowerUpKind, number>;

/**
 * Falling capsules: a pill that bobs and rocks a little, over a soft glow of
 * its color that breathes. Few at once (MAX_FALLING), matched by index.
 */
export class CapsuleLayer {
  private readonly slots: CapsuleSlot[] = [];
  private clockMs = 0;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    for (let i = 0; i < SLOTS; i++) {
      const glow = scene.add.image(0, 0, BreakerTexture.FLARE).setDepth(DEPTH.CAPSULE_GLOW).setVisible(false);
      const pill = scene.add
        .image(0, 0, capsuleTextureKey('multi'))
        .setDisplaySize(CapsuleArt.WIDTH, CapsuleArt.HEIGHT)
        .setDepth(DEPTH.CAPSULES)
        .setVisible(false);
      layer.add(glow);
      layer.add(pill);
      this.slots.push({ pill, glow, kind: null });
    }
  }

  sync(state: BreakerState, dtMs: number): void {
    this.clockMs += dtMs * state.timeScale;
    const t = this.clockMs / 1000;
    const capsules = state.capsules;
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const c = i < capsules.length ? capsules[i] : null;
      if (!c || !c.alive) {
        if (slot.kind !== null) {
          slot.kind = null;
          slot.pill.setVisible(false);
          slot.glow.setVisible(false);
        }
        continue;
      }
      if (slot.kind !== c.kind) {
        slot.kind = c.kind;
        slot.pill.setTexture(capsuleTextureKey(c.kind)).setVisible(true);
        slot.glow.setTint(GLOW_TINT[c.kind]).setVisible(true);
      }
      const phase = t * 5 + c.id * 1.7;
      const y = lerp(c.prevY, c.y, state.alpha) + Math.sin(phase) * 1.5;
      const breathe = 1 + Math.sin(phase * 1.3) * 0.04;
      slot.pill
        .setPosition(c.x, y)
        .setDisplaySize(CapsuleArt.WIDTH * breathe, CapsuleArt.HEIGHT * breathe)
        .setRotation(Math.sin(phase * 0.6) * 0.07);
      slot.glow
        .setPosition(c.x, y)
        .setDisplaySize(CapsuleArt.WIDTH * 1.9, CapsuleArt.HEIGHT * 2.6)
        .setAlpha(0.32 + 0.18 * Math.sin(phase * 1.3));
    }
  }
}
