import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import { GameObjects, Physics, Scene } from 'phaser';
import { ChunkPlan, FloorPiece, Piece } from '../generation/chunk-plan';
import { floorRunEnd, TILE } from '../generation/geometry';
import { WorldGenerator } from '../generation/world-generator';
import CoinManager from './CoinManager';
import CollapsingPlatformManager from './CollapsingPlatformManager';
import DecorationManager from './DecorationManager';
import ObstacleManager from './ObstacleManager';
import PicturePool from './PicturePool';

/** The pools that hold what the world places and takes back. */
export interface WorldPools {
  stones: ObstacleManager;
  coins: CoinManager;
  decoration: DecorationManager;
  bridges: CollapsingPlatformManager;
}

/** How far past the right edge of the view the world is kept built. */
const BUILD_AHEAD = 500;
/** How far behind the camera a chunk has to end before it is released. */
const RELEASE_DISTANCE = 600;
const INVISIBLE_TEXTURE = 'invisBlock';
const WATER_COLOR = 0x1a5276;
const WATER_ALPHA = 0.4;

/** A chunk in the world: its plan and everything built from it. */
interface BuiltChunk {
  plan: ChunkPlan;
  /** What the player stands on: runs of floor, blocks and platforms. */
  bodies: Physics.Arcade.Sprite[];
  /** Floor tiles, blocks and grass. */
  pictures: GameObjects.Image[];
  /** The fishing hut and its water. */
  scenery: GameObjects.GameObject[];
  stones: Physics.Arcade.Sprite[];
  coins: Physics.Arcade.Sprite[];
  decoration: GameObjects.Sprite[];
  bridges: Physics.Arcade.Sprite[][];
}

/**
 * Turns the generator's plans into the world the player runs on, and takes
 * each chunk back whole once it is far behind. It decides nothing: every
 * position comes from the plan.
 *
 * What is drawn and what is stood on are kept apart. A run of floor is a
 * row of tile pictures over a single invisible body, so the player crosses
 * no seams between its tiles. Bodies and pictures are both reused.
 */
class WorldBuilder {
  /** Everything the player stands on, all of it invisible. */
  readonly floor: Physics.Arcade.StaticGroup;
  /** What is drawn of the floor, the blocks and the grass. */
  readonly pictures: PicturePool;
  readonly scenery: GameObjects.Group;
  private freeBodies: Physics.Arcade.Sprite[] = [];
  private chunks: BuiltChunk[] = [];
  private builtUntilX = 0;

  constructor(
    private readonly scene: Scene,
    private readonly generator: WorldGenerator,
    private readonly pools: WorldPools
  ) {
    this.floor = scene.physics.add.staticGroup();
    this.pictures = new PicturePool(scene);
    this.scenery = scene.add.group();

    // A 1x1 see-through texture for the bodies.
    if (!scene.textures.exists(INVISIBLE_TEXTURE)) {
      const gfx = scene.add.graphics();
      gfx.fillStyle(0x000000, 0);
      gfx.fillRect(0, 0, 1, 1);
      gfx.generateTexture(INVISIBLE_TEXTURE, 1, 1);
      gfx.destroy();
    }
  }

  /** The plans of the chunks in the world now, left to right. */
  get liveChunks(): readonly ChunkPlan[] {
    return this.chunks.map((chunk) => chunk.plan);
  }

  /**
   * Builds until the world reaches well past the right edge of the view.
   * How far the camera moved since the last call changes how many chunks
   * are built now, never what they are.
   */
  fillAhead(cameraScrollX: number) {
    const target = cameraScrollX + this.scene.scale.width + BUILD_AHEAD;
    while (this.builtUntilX < target) {
      const plan = this.generator.next();
      this.chunks.push(this.build(plan));
      this.builtUntilX = plan.endX;
    }
  }

  /** Releases every chunk that ended far enough behind the camera. */
  releaseBehind(cameraScrollX: number) {
    const threshold = cameraScrollX - RELEASE_DISTANCE;
    let released = 0;
    while (released < this.chunks.length && this.chunks[released].plan.endX + TILE.END_WIDTH < threshold) {
      this.release(this.chunks[released]);
      released++;
    }
    if (released > 0) this.chunks.splice(0, released);
  }

  /** Releases the whole world. */
  releaseAll() {
    for (const chunk of this.chunks) this.release(chunk);
    this.chunks = [];
  }

  private build(plan: ChunkPlan): BuiltChunk {
    const chunk: BuiltChunk = {
      plan,
      bodies: [],
      pictures: [],
      scenery: [],
      stones: [],
      coins: [],
      decoration: [],
      bridges: [],
    };
    for (const piece of plan.pieces) this.buildPiece(piece, chunk);
    return chunk;
  }

  private buildPiece(piece: Piece, chunk: BuiltChunk) {
    switch (piece.type) {
      case 'floor':
        this.buildFloor(piece, chunk);
        break;
      case 'block': {
        const top = piece.y - TILE.BLOCK_SIZE / 2;
        chunk.bodies.push(this.takeBody(piece.x, top, TILE.BLOCK_SIZE, TILE.BLOCK_SIZE));
        chunk.pictures.push(this.pictures.take(piece.x, piece.y, RetroRunnerMedia.GRASS_BLOCK));
        break;
      }
      case 'platform':
        chunk.bodies.push(this.takeBody(piece.x, piece.y, piece.width, piece.height));
        break;
      case 'bridge':
        chunk.bridges.push(this.pools.bridges.spawnBridge(piece.startX, piece.endX, piece.floorY));
        break;
      case 'stone':
        chunk.stones.push(this.pools.stones.spawn(piece.x, piece.floorY, piece.key));
        break;
      case 'coin':
        chunk.coins.push(this.pools.coins.spawn(piece.x, piece.y));
        break;
      case 'deco':
        chunk.decoration.push(this.pools.decoration.place(piece));
        break;
      case 'grass':
        chunk.pictures.push(this.pictures.take(piece.x, piece.y, piece.key));
        break;
      case 'hut': {
        const hut = this.scene.add
          .sprite(piece.x, piece.y, RetroRunnerMedia.FISHING_HUT)
          .setOrigin(0, 0)
          .setDepth(11)
          .setName('fishing-hut');
        this.scenery.add(hut);
        chunk.scenery.push(hut);
        break;
      }
      case 'water': {
        const height = this.scene.scale.height - piece.y + 20;
        const water = this.scene.add
          .rectangle(piece.x, piece.y, piece.width, height, WATER_COLOR, WATER_ALPHA)
          .setOrigin(0, 0)
          .setDepth(-1);
        this.scenery.add(water);
        chunk.scenery.push(water);
        break;
      }
    }
  }

  /** The tiles of a run of floor, over one body that spans all of them. */
  private buildFloor(piece: FloorPiece, chunk: BuiltChunk) {
    const endX = floorRunEnd(piece.x, piece.centerTiles);
    const top = piece.y - TILE.FLOOR_HEIGHT / 2;
    chunk.bodies.push(this.takeBody(piece.x, top, endX + TILE.END_WIDTH - piece.x, TILE.FLOOR_HEIGHT));

    chunk.pictures.push(this.pictures.take(piece.x, piece.y, RetroRunnerMedia.FLOORGRASS_START));
    for (let i = 0; i < piece.centerTiles; i++) {
      const x = piece.x + TILE.START_WIDTH + i * TILE.CENTER_WIDTH;
      chunk.pictures.push(this.pictures.take(x, piece.y, RetroRunnerMedia.FLOORGRASS_CENTER));
    }
    chunk.pictures.push(this.pictures.take(endX, piece.y, RetroRunnerMedia.FLOORGRASS_END));
  }

  /**
   * An invisible body to stand on, its top-left corner at `left`, `top`: a
   * 1x1 texture stretched to the size, so the body matches it exactly. A
   * static body copies its size and place from its sprite only when
   * refreshed, so a reused one is refreshed after it moves.
   */
  private takeBody(left: number, top: number, width: number, height: number): Physics.Arcade.Sprite {
    let body = this.freeBodies.pop();
    if (body) {
      body.setActive(true);
      body.body!.enable = true;
    } else {
      body = this.floor.create(left, top, INVISIBLE_TEXTURE) as Physics.Arcade.Sprite;
      body.setVisible(false).setOrigin(0, 0);
    }
    body.setPosition(left, top).setDisplaySize(width, height);
    body.refreshBody();
    return body;
  }

  private releaseBody(body: Physics.Arcade.Sprite) {
    body.setActive(false);
    body.body!.enable = false;
    this.freeBodies.push(body);
  }

  private release(chunk: BuiltChunk) {
    for (const body of chunk.bodies) this.releaseBody(body);
    for (const picture of chunk.pictures) this.pictures.release(picture);
    for (const thing of chunk.scenery) thing.destroy();
    for (const stone of chunk.stones) this.pools.stones.release(stone);
    for (const coin of chunk.coins) this.pools.coins.release(coin);
    for (const deco of chunk.decoration) this.pools.decoration.release(deco);
    for (const bridge of chunk.bridges) this.pools.bridges.release(bridge);
  }
}

export default WorldBuilder;
