/**
 * Scene keys of Nova Breaker. Here and not in main.ts, so the scenes can
 * use them without importing main.ts (which imports the scenes).
 */
export enum BreakerSceneKeys {
  BOOT = 'BreakerBoot',
  GAME = 'BreakerGame',
}
