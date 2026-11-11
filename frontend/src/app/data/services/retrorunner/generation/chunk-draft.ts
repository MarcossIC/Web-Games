import SeededRandom from '../utils/SeededRandom';
import { BiomeType, Carry, Piece } from './chunk-plan';
import { Difficulty } from './difficulty-curve';
import { Exclusion, planCoins, planDecoration, planGrass, planStone } from './fill';
import { floorRunEnd } from './geometry';

/** The independent random streams of one chunk. */
export interface ChunkStreams {
  /** Everything that shapes the ground: one decision after another. */
  terrain: SeededRandom;
  obstacles: SeededRandom;
  coins: SeededRandom;
  /** Looks only. */
  decoration: SeededRandom;
  grass: SeededRandom;
}

/**
 * A chunk being planned: the pieces so far and a cursor where the next
 * floor starts. Patterns and the generator write into it; nothing here
 * touches Phaser.
 */
export class ChunkDraft {
  readonly pieces: Piece[] = [];
  /** Where the next floor starts: over the end tile of the last one. */
  x: number;

  constructor(
    readonly startX: number,
    /** The floor's lowest height (the centre of its tiles). */
    readonly floorY: number,
    readonly entryY: number,
    /** The chunk before was a gap, or there was none: start level. */
    readonly mustStartLevel: boolean,
    readonly difficulty: Difficulty,
    readonly biome: BiomeType,
    readonly rng: ChunkStreams,
    /** Handed down to the next chunk; filling updates it. */
    readonly carry: Carry
  ) {
    this.x = startX;
  }

  /** The current height as an elevation: 0 is the lowest, negative higher. */
  get entryElevation(): number {
    return this.entryY - this.floorY;
  }

  /** Lays a run of floor with its grass from the cursor, which moves to its end tile. */
  ground(centerTiles: number, y: number): { startX: number; endX: number } {
    const startX = this.x;
    const endX = floorRunEnd(startX, centerTiles);
    this.pieces.push({ type: 'floor', x: startX, y, centerTiles });
    this.pieces.push(...planGrass(this.rng.grass, startX, endX, y));
    this.x = endX;
    return { startX, endX };
  }

  block(x: number, y: number) {
    this.pieces.push({ type: 'block', x, y });
  }

  /** An invisible body to stand on, from its top-left corner. */
  platform(x: number, y: number, width: number, height: number) {
    this.pieces.push({ type: 'platform', x, y, width, height });
  }

  add(...pieces: Piece[]) {
    this.pieces.push(...pieces);
  }

  coins(startX: number, endX: number, floorY: number, chance: number) {
    this.pieces.push(...planCoins(this.rng.coins, startX, endX, floorY, chance));
  }

  stone(startX: number, endX: number, floorY: number, chance: number) {
    const stone = planStone(this.rng.obstacles, startX, endX, floorY, chance, this.carry);
    if (stone) this.pieces.push(stone);
  }

  decoration(startX: number, endX: number, floorY: number, exclusions?: readonly Exclusion[]) {
    this.pieces.push(
      ...planDecoration(this.rng.decoration, startX, endX, floorY, this.biome, this.carry, exclusions)
    );
  }
}
