/**
 * Scene keys of Nova Breaker. Here and not in main.ts, so the scenes can
 * use them without importing main.ts (which imports the scenes).
 */
export enum BreakerSceneKeys {
  BOOT = 'BreakerBoot',
  GAME = 'BreakerGame',
}

/**
 * Registry key of the `Board` (world height + the HUD rows above it) that
 * main.ts measured from the parent element before booting. Missing (the
 * specs): the desktop 960x720.
 */
export const BREAKER_BOARD = 'breaker-board';
