import { GameObjects, Scene } from 'phaser';

const WIDTH = 56;
const HEIGHT = 3;
const DEPTH = 100;

/**
 * How long a key has been held: a label over a bar that fills up. It shows
 * only while the key is down, so whoever holds it sees the hold working.
 */
class HoldBar {
  private readonly parts: GameObjects.Components.Visible[];
  private readonly fill: GameObjects.Rectangle;
  private shown = false;

  /** Centred on `x`, its top at `y`, fixed on the screen. */
  constructor(scene: Scene, x: number, y: number, label: string) {
    const text = scene.add
      .text(x, y, label, {
        fontSize: '8px',
        color: '#fff',
        stroke: '#07060d',
        strokeThickness: 2,
        fontFamily: 'Silkscreen, monospace',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);
    const track = scene.add
      .rectangle(x - WIDTH / 2, y + 11, WIDTH, HEIGHT, 0x07060d, 0.8)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);
    this.fill = scene.add
      .rectangle(x - WIDTH / 2, y + 11, WIDTH, HEIGHT, 0xffe14a)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);
    this.parts = [text, track, this.fill];
    // Created visible: marked shown so the first call hides it.
    this.shown = true;
    this.setProgress(0);
  }

  /** 0 hides it; up to 1 fills the bar. */
  setProgress(progress: number) {
    const show = progress > 0;
    if (show !== this.shown) {
      this.shown = show;
      for (const part of this.parts) part.setVisible(show);
    }
    if (show) this.fill.scaleX = progress;
  }
}

export default HoldBar;
