import type { PowerUpKind } from '@app/data/services/breaker/engine/types';

/** How a power-up capsule is described to the player (How to play sheet). */
export interface BreakerPowerUpInfo {
  /** Short name on the chip. */
  readonly label: string;
  /** Three to five words about what it does. */
  readonly description: string;
  /** Capsule color: the one source for the painted capsule, the HUD bar, the catch ring and this sheet. */
  readonly color: string;
  /** Hazards appear from sector 5 and hurt the player; drawn dark red with stripes. */
  readonly hazard: boolean;
}

/** A Record, so a power-up added to the engine fails to compile until described. */
export const BREAKER_POWER_UP_INFO: Record<PowerUpKind, BreakerPowerUpInfo> = {
  multi: { label: 'Multi', description: 'splits every ball in three', color: '#5ee6ff', hazard: false },
  wide: { label: 'Wide', description: 'a longer paddle', color: '#66b2ff', hazard: false },
  laser: { label: 'Laser', description: 'shoots bricks from the paddle', color: '#ff2e88', hazard: false },
  magnet: { label: 'Magnet', description: 'balls stick, then aim', color: '#b78bff', hazard: false },
  slow: { label: 'Slow', description: 'balls move slower', color: '#5dfc9a', hazard: false },
  fire: { label: 'Fire', description: 'balls burn through bricks', color: '#ff9a3d', hazard: false },
  barrier: { label: 'Barrier', description: 'a floor that saves one ball', color: '#2fe6c8', hazard: false },
  life: { label: 'Life', description: 'one extra life', color: '#ff6fae', hazard: false },
  nova: { label: 'Nova', description: 'fills the Overdrive meter', color: '#ffe14a', hazard: false },
  shrink: { label: 'Shrink', description: 'a smaller paddle', color: '#ff5c5c', hazard: true },
  fast: { label: 'Fast', description: 'balls move faster', color: '#ff5c5c', hazard: true },
};

/** Display order: the good ones first, the hazards last. */
export const BREAKER_POWER_UP_ORDER: readonly PowerUpKind[] = [
  'multi', 'wide', 'laser', 'magnet', 'slow', 'fire', 'barrier', 'life', 'nova', 'shrink', 'fast',
];
