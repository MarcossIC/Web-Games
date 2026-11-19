import { clamp01, easeOutBack } from './view-math';

/**
 * The numbers behind how THE CORE looks, apart from Phaser so they can be
 * tested: damage states, the HP bar, the eye charging before a volley, the
 * WARNING banner and the defeat sequence. Nothing here allocates.
 */

/** 0 intact, 1 cracked (under 2/3 hp), 2 breaking up (under 1/3). */
export function bossCrackLevel(hp: number, maxHp: number): 0 | 1 | 2 {
  const share = bossHpShare(hp, maxHp);
  if (share <= 1 / 3) return 2;
  if (share <= 2 / 3) return 1;
  return 0;
}

export function bossHpShare(hp: number, maxHp: number): number {
  return maxHp > 0 ? clamp01(hp / maxHp) : 0;
}

/** Crop width of the HP fill in texture pixels; any hp left shows at least one. */
export function hpFillCropPx(share: number, fillW: number, textureScale: number): number {
  const full = fillW * textureScale;
  if (!(share > 0)) return 0;
  return Math.max(1, Math.round(full * clamp01(share)));
}

const CHARGE_MS = 700;

/** 0..1: how lit the eye is as the next volley comes (1 when it fires). */
export function eyeCharge(shotMs: number): number {
  return 1 - clamp01(shotMs / CHARGE_MS);
}

const GHOST = { WAIT_MS: 300, DRAIN_PER_S: 0.6 } as const;

/**
 * The pale bar behind the HP fill that shows the damage just taken: it
 * holds a moment, then drains down to the hp. Never under it; a heal (a
 * new fight) jumps it up.
 */
export class DamageGhost {
  value = 1;
  private waitMs = 0;

  update(share: number, dtMs: number): number {
    if (share >= this.value) {
      this.waitMs = 0;
      this.value = share;
    } else if (this.waitMs < GHOST.WAIT_MS) {
      this.waitMs += dtMs;
    } else {
      this.value = Math.max(share, this.value - (GHOST.DRAIN_PER_S * dtMs) / 1000);
      // Caught up: the next hit holds again before it drains.
      if (this.value <= share) this.waitMs = 0;
    }
    return this.value;
  }
}

export const WARNING = {
  IN_MS: 220,
  HOLD_MS: 1900,
  OUT_MS: 450,
  TOTAL_MS: 220 + 1900 + 450,
  BLINK_MS: 170,
  Y: 246,
} as const;

export interface WarningLook {
  visible: boolean;
  alpha: number;
  scaleY: number;
}

const look: WarningLook = { visible: false, alpha: 0, scaleY: 0 };

/** The WARNING banner `ms` after it was asked for (negative: not shown). The object is reused. */
export function warningLook(ms: number): Readonly<WarningLook> {
  if (ms < 0 || ms >= WARNING.TOTAL_MS) {
    look.visible = false;
    look.alpha = 0;
    look.scaleY = 0;
    return look;
  }
  look.visible = true;
  if (ms < WARNING.IN_MS) {
    look.scaleY = clamp01(easeOutBack(ms / WARNING.IN_MS));
    look.alpha = 1;
  } else if (ms < WARNING.IN_MS + WARNING.HOLD_MS) {
    look.scaleY = 1;
    const blink = Math.floor((ms - WARNING.IN_MS) / WARNING.BLINK_MS) % 2;
    look.alpha = blink === 0 ? 1 : 0.55;
  } else {
    look.scaleY = 1;
    look.alpha = 1 - clamp01((ms - WARNING.IN_MS - WARNING.HOLD_MS) / WARNING.OUT_MS);
  }
  return look;
}

/** The defeat, in real ms after boss-defeated: bursts across the hull, then the big one, then a fade. */
export const DEFEAT = {
  BURSTS_MS: [0, 160, 340, 560, 800, 1060, 1340] as readonly number[],
  FINALE_MS: 1650,
  FADE_MS: 450,
} as const;
