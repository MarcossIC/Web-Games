export interface DifficultyConfig {
  gapChance: number;
  minGapWidth: number;
  maxGapWidth: number;
  minCenterTiles: number;
  maxCenterTiles: number;
  obstacleChance: number;
  coinChance: number;
  patternChance: number;
  biome: BiomeType;
}

export enum BiomeType {
  PLAINS = 'plains',
  FOREST = 'forest',
  DUSK = 'dusk',
}

const MAX_SAFE_GAP = 200;

interface DifficultyLevel {
  threshold: number;
  config: DifficultyConfig;
}

const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  {
    threshold: 0,
    config: {
      gapChance: 0,
      minGapWidth: 40,
      maxGapWidth: 70,
      minCenterTiles: 7,
      maxCenterTiles: 14,
      obstacleChance: 0,
      coinChance: 0.5,
      patternChance: 0.1,
      biome: BiomeType.PLAINS,
    },
  },
  {
    threshold: 800,
    config: {
      gapChance: 0.15,
      minGapWidth: 40,
      maxGapWidth: 80,
      minCenterTiles: 6,
      maxCenterTiles: 12,
      obstacleChance: 0,
      coinChance: 0.5,
      patternChance: 0.2,
      biome: BiomeType.PLAINS,
    },
  },
  {
    threshold: 2000,
    config: {
      gapChance: 0.2,
      minGapWidth: 50,
      maxGapWidth: 100,
      minCenterTiles: 5,
      maxCenterTiles: 10,
      obstacleChance: 0.08,
      coinChance: 0.45,
      patternChance: 0.3,
      biome: BiomeType.PLAINS,
    },
  },
  {
    threshold: 4000,
    config: {
      gapChance: 0.25,
      minGapWidth: 60,
      maxGapWidth: 120,
      minCenterTiles: 4,
      maxCenterTiles: 8,
      obstacleChance: 0.15,
      coinChance: 0.4,
      patternChance: 0.35,
      biome: BiomeType.FOREST,
    },
  },
  {
    threshold: 7000,
    config: {
      gapChance: 0.3,
      minGapWidth: 70,
      maxGapWidth: 150,
      minCenterTiles: 3,
      maxCenterTiles: 7,
      obstacleChance: 0.2,
      coinChance: 0.4,
      patternChance: 0.4,
      biome: BiomeType.FOREST,
    },
  },
  {
    threshold: 11000,
    config: {
      gapChance: 0.35,
      minGapWidth: 80,
      maxGapWidth: MAX_SAFE_GAP,
      minCenterTiles: 2,
      maxCenterTiles: 6,
      obstacleChance: 0.25,
      coinChance: 0.45,
      patternChance: 0.45,
      biome: BiomeType.DUSK,
    },
  },
];

// Sinusoidal wave parameters for tension/rest pacing
const WAVE_PERIOD = 3000;  // pixels between tension peaks
const WAVE_STRENGTH = 0.25; // how much the wave reduces difficulty (0-1)

/** Linearly interpolate between two numbers */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolate all numeric fields of two DifficultyConfigs */
function lerpConfig(a: DifficultyConfig, b: DifficultyConfig, t: number): DifficultyConfig {
  return {
    gapChance: lerp(a.gapChance, b.gapChance, t),
    minGapWidth: lerp(a.minGapWidth, b.minGapWidth, t),
    maxGapWidth: lerp(a.maxGapWidth, b.maxGapWidth, t),
    minCenterTiles: Math.round(lerp(a.minCenterTiles, b.minCenterTiles, t)),
    maxCenterTiles: Math.round(lerp(a.maxCenterTiles, b.maxCenterTiles, t)),
    obstacleChance: lerp(a.obstacleChance, b.obstacleChance, t),
    coinChance: lerp(a.coinChance, b.coinChance, t),
    patternChance: lerp(a.patternChance, b.patternChance, t),
    // Biome uses the "from" biome until we cross the threshold
    biome: t < 0.5 ? a.biome : b.biome,
  };
}

class DifficultyManager {
  private lastSegmentWasHard: boolean = false;

  getConfig(playerX: number): DifficultyConfig {
    // Find the two bracketing difficulty levels and interpolate
    let lower = DIFFICULTY_LEVELS[0];
    let upper = DIFFICULTY_LEVELS[0];

    for (let i = 0; i < DIFFICULTY_LEVELS.length - 1; i++) {
      if (playerX >= DIFFICULTY_LEVELS[i].threshold) {
        lower = DIFFICULTY_LEVELS[i];
        upper = DIFFICULTY_LEVELS[i + 1];
      }
    }

    // If past the last threshold, use the final config
    if (playerX >= DIFFICULTY_LEVELS[DIFFICULTY_LEVELS.length - 1].threshold) {
      lower = DIFFICULTY_LEVELS[DIFFICULTY_LEVELS.length - 1];
      upper = lower;
    }

    // Calculate interpolation factor between the two levels
    const range = upper.threshold - lower.threshold;
    const t = range > 0 ? Math.min(1, (playerX - lower.threshold) / range) : 1;

    let config = lerpConfig(lower.config, upper.config, t);

    // Apply sinusoidal wave for tension/rest pacing
    // Wave oscillates between 1.0 (full difficulty) and (1 - WAVE_STRENGTH) (rest zone)
    const wave = Math.sin((playerX / WAVE_PERIOD) * Math.PI * 2);
    const restFactor = 1 - WAVE_STRENGTH * Math.max(0, -wave); // only reduce on negative phase

    config = {
      ...config,
      gapChance: config.gapChance * restFactor,
      obstacleChance: config.obstacleChance * restFactor,
      patternChance: config.patternChance * restFactor,
      // Increase coin chance during rest zones (reward)
      coinChance: Math.min(0.7, config.coinChance + WAVE_STRENGTH * Math.max(0, -wave) * 0.2),
    };

    return config;
  }

  /**
   * Markov-style rest zone probability.
   * Call after generating a hard segment to track pacing state.
   */
  markSegmentDifficulty(wasHard: boolean): number {
    if (this.lastSegmentWasHard && wasHard) {
      // After two consecutive hard segments, force a rest zone (70% chance)
      this.lastSegmentWasHard = false;
      return 0.7;
    }
    this.lastSegmentWasHard = wasHard;
    return 0;
  }
}

export default DifficultyManager;
