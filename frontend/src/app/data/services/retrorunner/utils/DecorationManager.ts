import { DecoPiece } from '@app/data/services/retrorunner/generation/chunk-plan';
import { GameObjects, Scene } from 'phaser';

/**
 * The decoration: a pool that draws each piece the world's plan asks for.
 * What goes where is decided in generation/fill.ts; only the picture's
 * width is known here, so here is where it is kept inside its floor.
 */
class DecorationManager {
  private decorations: GameObjects.Group;
  private free: GameObjects.Sprite[] = [];

  constructor(scene: Scene) {
    this.decorations = scene.add.group();
  }

  place(piece: DecoPiece): GameObjects.Sprite {
    let deco = this.free.pop();
    if (deco) {
      deco.setTexture(piece.key);
      deco.setPosition(piece.x, piece.y);
      deco.setActive(true).setVisible(true);
    } else {
      deco = this.decorations.create(piece.x, piece.y, piece.key) as GameObjects.Sprite;
    }

    deco.setOrigin(0.5, 1).setDepth(piece.depth).setScale(piece.scale).setAlpha(piece.alpha);
    deco.clearTint();
    if (piece.tint !== null) deco.setTint(piece.tint);
    deco.setX(this.clampX(piece, deco.width * piece.scale));
    return deco;
  }

  release(deco: GameObjects.Sprite) {
    deco.setActive(false).setVisible(false);
    this.free.push(deco);
  }

  /** Keeps the whole picture over its floor; a floor too narrow centres it. */
  private clampX(piece: DecoPiece, width: number): number {
    const minX = piece.clampStartX + width / 2;
    const maxX = piece.clampEndX - width / 2;
    if (minX >= maxX) return (piece.clampStartX + piece.clampEndX) / 2;
    return Math.max(minX, Math.min(maxX, piece.x));
  }

  getGroup(): GameObjects.Group {
    return this.decorations;
  }
}

export default DecorationManager;
