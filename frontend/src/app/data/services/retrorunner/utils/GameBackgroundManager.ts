import { RetroRunnerMedia } from '@app/data/models/retro-runner/RetroRunnerKeys';
import { PhaserSourceImage } from '@app/data/services/phaser/types';
import { GameObjects, Scale, Textures } from 'phaser';

class GameBackgroundManager {
  private calcBackgroundScale({ scaleWidth, scaleHeight, bgWidth, bgHeight }) {
    const scaleX = scaleWidth / bgWidth;
    const scaleY = scaleHeight / bgHeight;
    return Math.max(scaleX, scaleY);
  }

  public scaleBackground(
    background: GameObjects.TileSprite,
    render: PhaserSourceImage,
    scale: Scale.ScaleManager
  ) {
    // Obtener dimensiones
    const bgWidth = render.width;
    const bgHeight = render.height;
    const scaleWidth = scale.width;
    const scaleHeight = scale.height;

    // Calcular la escala
    const backgroundScale = this.calcBackgroundScale({
      bgWidth,
      bgHeight,
      scaleWidth,
      scaleHeight,
    });

    // Ajustar la escala del fondo
    background.setScale(backgroundScale).setScrollFactor(0);

    // Ajustar el tamaño del Sprite para cubrir toda la pantalla
    background.displayWidth = scaleWidth;
    background.displayHeight = scaleHeight;
  }
}

export default GameBackgroundManager;
