import { GameObjects, Scene } from 'phaser';
import { Rect } from './runner-layout';

/** Rows the face of a key sinks when it is pressed: the lip under it. */
const LIP = 3;
const BORDER = 2;
const LABEL_FONT = 'Silkscreen, monospace';

/** The colours of a key: the keycaps of the site, drawn in the game. */
export interface KeyLook {
  readonly face: number;
  readonly border: number;
  readonly lip: number;
  /** The glyph or the label. */
  readonly ink: number;
}

export const KEY_LOOKS = {
  /** The arrows that move. */
  pad: { face: 0x1c1830, border: 0x3a3360, lip: 0x07060d, ink: 0xece9f7 },
  /** The key pressed the most: the one that stands out. */
  jump: { face: 0xff2e88, border: 0xff8ab8, lip: 0x8a1247, ink: 0xffffff },
  crouch: { face: 0x1c1830, border: 0x5ee6ff, lip: 0x07060d, ink: 0x5ee6ff },
  pause: { face: 0x100e1c, border: 0x3a3360, lip: 0x07060d, ink: 0xffe14a },
  /** A button of a menu. */
  menu: { face: 0x1c1830, border: 0x3a3360, lip: 0x07060d, ink: 0xece9f7 },
  /** The button of a menu that goes on with the game. */
  primary: { face: 0xffe14a, border: 0xfff2a6, lip: 0x8f7a12, ink: 0x07060d },
} as const satisfies Record<string, KeyLook>;

export type Glyph = 'left' | 'right' | 'up' | 'down' | 'pause';

export interface KeyContent {
  readonly glyph?: Glyph;
  readonly label?: string;
  /** Font size of the label: a multiple of 8, the grid of the typeface. */
  readonly labelSize?: 8 | 16;
  /** How see-through the key is while nothing presses it. */
  readonly idleAlpha?: number;
}

const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** Size of the steps a glyph is built from, for a key `width` wide. */
const glyphUnit = (width: number): number => (width >= 80 ? 4 : width >= 52 ? 3 : 2);

/**
 * Draws a glyph out of whole steps of `unit` pixels, centred on `cx`,`cy`.
 * An arrow is a staircase and not a triangle: the picture is enlarged, and
 * a slanted edge would not land on its pixels.
 */
function paintGlyph(g: GameObjects.Graphics, glyph: Glyph, cx: number, cy: number, unit: number, color: number) {
  g.fillStyle(color);
  if (glyph === 'pause') {
    const width = 2 * unit;
    const height = 6 * unit;
    g.fillRect(cx - unit - width, cy - height / 2, width, height);
    g.fillRect(cx + unit, cy - height / 2, width, height);
    return;
  }

  const steps = 5;
  // From the tip to the base, each row one step longer on both sides.
  const tip = -Math.floor((steps * unit) / 2);
  for (let i = 0; i < steps; i++) {
    const half = (i + 1) * unit;
    const along = tip + i * unit;
    switch (glyph) {
      case 'up':
        g.fillRect(cx - half, cy + along, half * 2, unit);
        break;
      case 'down':
        g.fillRect(cx - half, cy - along - unit, half * 2, unit);
        break;
      case 'left':
        g.fillRect(cx + along, cy - half, unit, half * 2);
        break;
      case 'right':
        g.fillRect(cx - along - unit, cy - half, unit, half * 2);
        break;
    }
  }
}

/**
 * A key drawn in the game: a face over a lip, like the keycaps of the site.
 * Pressed, the face sinks onto the lip and lights up. It only draws; who
 * presses it, and what that does, belongs to the scene.
 */
class PixelKey {
  /** Everything of the key. Add it to a container to move or fade it along. */
  readonly container: GameObjects.Container;
  private readonly top: GameObjects.Container;
  private readonly shine: GameObjects.Rectangle;
  private readonly text?: GameObjects.Text;
  private readonly idleAlpha: number;
  private pressed = false;

  /** `rect` is the whole key, lip included. */
  constructor(scene: Scene, readonly rect: Rect, look: KeyLook, content: KeyContent) {
    const { x, y, w, h } = rect;
    const faceHeight = h - LIP;
    const cx = Math.round(w / 2);
    const cy = Math.round(faceHeight / 2);

    const lip = scene.add.rectangle(0, LIP, w, faceHeight, look.lip).setOrigin(0, 0);

    const plate = scene.add.graphics();
    plate.fillStyle(look.border);
    plate.fillRect(0, 0, w, faceHeight);
    plate.fillStyle(look.face);
    plate.fillRect(BORDER, BORDER, w - BORDER * 2, faceHeight - BORDER * 2);
    if (content.glyph) paintGlyph(plate, content.glyph, cx, cy, glyphUnit(w), look.ink);

    this.shine = scene.add
      .rectangle(BORDER, BORDER, w - BORDER * 2, faceHeight - BORDER * 2, 0xffffff, 0.25)
      .setOrigin(0, 0)
      .setVisible(false);

    this.top = scene.add.container(0, 0, [plate, this.shine]);
    if (content.label !== undefined) {
      this.text = scene.add
        .text(cx, cy, content.label, {
          fontSize: `${content.labelSize ?? 16}px`,
          color: css(look.ink),
          fontFamily: LABEL_FONT,
        })
        .setOrigin(0.5, 0.5);
      this.top.add(this.text);
    }

    this.idleAlpha = content.idleAlpha ?? 1;
    this.container = scene.add.container(x, y, [lip, this.top]).setAlpha(this.idleAlpha);
  }

  setPressed(pressed: boolean): void {
    if (pressed === this.pressed) return;
    this.pressed = pressed;
    this.top.y = pressed ? LIP : 0;
    this.shine.setVisible(pressed);
    this.container.setAlpha(pressed ? 1 : this.idleAlpha);
  }

  setLabel(label: string): void {
    this.text?.setText(label);
  }
}

export default PixelKey;
