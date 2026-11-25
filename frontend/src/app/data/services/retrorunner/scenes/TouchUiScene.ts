import * as Phaser from 'phaser';
import { EventBus } from '@app/data/services/phaser/EventBus';
import { RUNNER_SEED, RunnerEvents, SceneKeys } from '@app/data/services/retrorunner/main';
import PixelKey, { KEY_LOOKS } from '@app/data/services/retrorunner/utils/PixelKey';
import {
  contains,
  DESKTOP_LAYOUT,
  LAYOUT_CHANGED,
  layoutOf,
  Rect,
  RunnerLayout,
} from '@app/data/services/retrorunner/utils/runner-layout';
import { TapTracker } from '@app-input';
import {
  idlePad,
  idleStick,
  readPad,
  STICK_RADIUS,
} from '@app/data/services/retrorunner/utils/touch-pad';
import { GameObjects, Scene } from 'phaser';

const DECK_COLOR = 0x100e1c;
const DECK_EDGE = 0x3a3360;
const DECK_LINES = 0x07060d;
const DECK_LABEL = '#a7a1c6';
/** Hints drawn over the picture let the world show through. */
const FLOATING_ALPHA = 0.35;
const STICK_RING = 0x5ee6ff;
const STICK_KNOB = 0xece9f7;
const JUMP_COLOR = 0xff2e88;
const KNOB_RADIUS = 13;
const JUMP_RADIUS = 26;

/**
 * What a touch screen adds over the run: the stick that floats under the
 * left thumb, the mark of the jump on the right, the deck they rest on when
 * the phone is upright, and pause in the top corner. There are no keys to
 * aim for: the left half of the screen is the stick, the right half jumps.
 *
 * It runs beside the game and never stops, so pause is still there while the
 * run is frozen (a paused scene hears nothing). It only draws what the
 * fingers do: the run reads the fingers itself, on every frame. Pause is the
 * one key it answers, and it asks for it like the page's button does.
 */
export class TouchUiScene extends Scene {
  private layout: RunnerLayout = DESKTOP_LAYOUT;
  private root?: GameObjects.Container;
  /** The stick and the jump mark, drawn again on every frame. */
  private fingersGfx?: GameObjects.Graphics;
  private hintAlpha = 1;
  private pause?: PixelKey;
  /** The seed of the level, on the deck: what the strip of the page shows on a desktop. */
  private seedLabel?: GameObjects.Text;
  private shownSeed = '';
  private readonly pad = idlePad();
  private readonly stick = idleStick();
  private readonly taps = new TapTracker<'pause'>((x, y) => {
    const zone = this.layout.controls?.pause.zone;
    return zone && contains(zone, x, y) ? 'pause' : null;
  });

  constructor() {
    super(SceneKeys.TOUCH_UI);
  }

  create() {
    this.draw();
    this.game.events.on(LAYOUT_CHANGED, this.draw, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(LAYOUT_CHANGED, this.draw, this);
    });

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      this.taps.down(pointer.id, pointer.x, pointer.y);
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      if (this.taps.up(pointer.id, pointer.x, pointer.y) === 'pause') {
        EventBus.emit(RunnerEvents.TOGGLE_PAUSE);
      }
    });
  }

  override update() {
    const controls = this.layout.controls;
    if (!controls) return;
    const pad = readPad(controls, this.input.manager.pointers, this.pad, this.stick);
    this.paintFingers(pad.jump);
    this.pause?.setPressed(this.taps.isPressed('pause'));
    this.showSeed();
  }

  /** Writes the seed of the level on the deck, when it changed. */
  private showSeed() {
    if (!this.seedLabel) return;
    const seed = (this.registry.get(RUNNER_SEED) as string | undefined) ?? '';
    if (seed === this.shownSeed) return;
    this.shownSeed = seed;
    this.seedLabel.setText(seed ? `Seed ${seed}` : '');
  }

  /** Draws everything again for the layout in use: the screen was turned. */
  private draw() {
    this.root?.destroy();
    this.root = undefined;
    this.fingersGfx = this.pause = undefined;
    this.seedLabel = undefined;
    this.shownSeed = '';
    this.taps.clear();

    this.layout = layoutOf(this.registry);
    const { controls, deck } = this.layout;
    // A screen played with the keyboard: nothing to add.
    if (!controls) return;

    const root = this.add.container(0, 0);
    if (deck) {
      root.add(this.paintDeck(deck));
      this.seedLabel = this.add
        .text(deck.x + Math.round(deck.w / 2), deck.y + deck.h - 14, '', {
          fontSize: '8px',
          color: DECK_LABEL,
          fontFamily: 'Silkscreen, monospace',
        })
        .setOrigin(0.5, 0.5);
      root.add(this.seedLabel);
    }

    this.hintAlpha = deck ? 0.7 : FLOATING_ALPHA;
    if (deck) {
      // What each thumb does, over where it rests.
      const label = (face: Rect, text: string) =>
        this.add
          .text(face.x + Math.round(face.w / 2), face.y - 2, text, {
            fontSize: '8px',
            color: DECK_LABEL,
            fontFamily: 'Silkscreen, monospace',
            align: 'center',
          })
          .setOrigin(0.5, 1);
      root.add([label(controls.stick.face, 'SLIDE TO MOVE'), label(controls.jump.face, 'TAP TO JUMP')]);
    }
    this.fingersGfx = this.add.graphics();
    root.add(this.fingersGfx);
    // Pause is always over the picture.
    this.pause = new PixelKey(this, controls.pause.face, KEY_LOOKS.pause, {
      glyph: 'pause',
      idleAlpha: 0.85,
    });
    root.add(this.pause.container);
    this.root = root;
  }

  /**
   * The stick under the thumb that holds it, or resting faintly where the
   * thumb goes; the jump mark lights up while a finger jumps.
   */
  private paintFingers(jumping: boolean) {
    const g = this.fingersGfx;
    const controls = this.layout.controls;
    if (!g || !controls) return;
    g.clear();

    const stick = this.stick;
    const home = controls.stick.face;
    const baseX = stick.active ? stick.baseX : home.x + home.w / 2;
    const baseY = stick.active ? stick.baseY : home.y + home.h / 2;
    const knobX = stick.active ? stick.push.knobX : baseX;
    const knobY = stick.active ? stick.push.knobY : baseY;
    const alpha = stick.active ? 0.9 : this.hintAlpha;

    g.fillStyle(DECK_COLOR, stick.active ? 0.35 : alpha * 0.4);
    g.fillCircle(baseX, baseY, STICK_RADIUS + 8);
    g.lineStyle(2, STICK_RING, alpha);
    g.strokeCircle(baseX, baseY, STICK_RADIUS + 8);
    // The four ways it goes, as notches on the ring.
    g.fillStyle(STICK_RING, alpha);
    const reach = STICK_RADIUS - 2;
    g.fillRect(baseX - 2, baseY - reach, 4, 4);
    g.fillRect(baseX - 2, baseY + reach - 4, 4, 4);
    g.fillRect(baseX - reach, baseY - 2, 4, 4);
    g.fillRect(baseX + reach - 4, baseY - 2, 4, 4);
    g.fillStyle(STICK_KNOB, alpha);
    g.fillCircle(knobX, knobY, KNOB_RADIUS);

    const mark = controls.jump.face;
    const jumpX = mark.x + mark.w / 2;
    const jumpY = mark.y + mark.h / 2;
    g.lineStyle(2, JUMP_COLOR, jumping ? 1 : this.hintAlpha);
    g.strokeCircle(jumpX, jumpY, JUMP_RADIUS);
    if (jumping) {
      g.fillStyle(JUMP_COLOR, 0.8);
      g.fillCircle(jumpX, jumpY, JUMP_RADIUS - 4);
    }
    // An up arrow in steps, like the glyphs of the keys.
    g.fillStyle(jumping ? 0xffffff : JUMP_COLOR, jumping ? 1 : this.hintAlpha);
    for (let i = 0; i < 4; i++) {
      const half = (i + 1) * 3;
      g.fillRect(jumpX - half, jumpY - 8 + i * 3, half * 2, 3);
    }
  }

  /** The panel the keys sit on: the cabinet of the site, with its scanlines. */
  private paintDeck(deck: Rect): GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(DECK_COLOR);
    g.fillRect(deck.x, deck.y, deck.w, deck.h);
    g.fillStyle(DECK_LINES, 0.45);
    for (let y = deck.y + 4; y < deck.y + deck.h; y += 4) {
      g.fillRect(deck.x, y, deck.w, 1);
    }
    g.fillStyle(DECK_EDGE);
    g.fillRect(deck.x, deck.y, deck.w, 2);
    return g;
  }
}
