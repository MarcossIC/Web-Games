/**
 * The public face of the Nova Breaker engine: the contract types, the
 * engine, and the pure pieces the view and the Angular side use directly
 * (records, time format, themes, tuning constants).
 */
export * from './types';
export { BreakerEngine, IDLE_INPUT } from './breaker-engine';
export * from './config';
export { traceAim, type AimObstacles } from './aim';
export { sectorParams, isSpecialSector, type SectorParams, type BrickMix } from './difficulty';
export { THEME_COUNT, TONE_COUNT, themeForSector, buildLevel, type Level, type LevelCell } from './levels';
export { comboMultiplier, SCORE } from './scoring';
export { isTimedEffect, POSITIVE_POWER_UPS, NEGATIVE_POWER_UPS } from './powerups';
export { isBossSector, bossNumber, bossMaxHp, bossBonus } from './boss';
export {
  emptyRecords,
  formatTime,
  recordRun,
  type BestRun,
  type BreakerRecords,
  type RecordOutcome,
} from './records';
