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
import { idlePad, readPad, TapTracker } from '@app/data/services/retrorunner/utils/touch-pad';
import { GameObjects, Scene } from 'phaser';

const DECK_COLOR = 0x100e1c;
const DECK_EDGE = 0x3a3360;
const DECK_LINES = 0x07060d;
const DECK_LABEL = '#a7a1c6';
/** Keys drawn over the picture let the world show through until pressed. */
const FLOATING_ALPHA = 0.5;

/**
 * What a touch screen adds over the run: the keys, the deck they sit on when
 * the phone is upright, and pause in the top corner.
 *
 * It runs beside the game and never stops, so pause is still there while the
 * run is frozen (a paused scene hears nothing). It only draws the keys of
 * the pad: the run reads the fingers itself, on every frame. Pause is the
 * one key it answers, and it asks for it like the page's button does.
 */
export class TouchUiScene extends Scene {
  private layout: RunnerLayout = DESKTOP_LAYOUT;
  private root?: GameObjects.Container;
  private left?: PixelKey;
  private right?: PixelKey;
  private crouch?: PixelKey;
  private jump?: PixelKey;
  private pause?: PixelKey;
  /** The seed of the level, on the deck: what the strip of the page shows on a desktop. */
  private seedLabel?: GameObjects.Text;
  private shownSeed = '';
  private readonly pad = idlePad();
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
    const pad = readPad(controls, this.input.manager.pointers, this.pad);
    this.left?.setPressed(pad.left);
    this.right?.setPressed(pad.right);
    this.crouch?.setPressed(pad.crouch);
    this.jump?.setPressed(pad.jump);
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
    this.left = this.right = this.crouch = this.jump = this.pause = undefined;
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

    const idleAlpha = deck ? 1 : FLOATING_ALPHA;
    this.left = new PixelKey(this, controls.left.face, KEY_LOOKS.pad, { glyph: 'left', idleAlpha });
    this.right = new PixelKey(this, controls.right.face, KEY_LOOKS.pad, { glyph: 'right', idleAlpha });
    this.crouch = new PixelKey(this, controls.crouch.face, KEY_LOOKS.crouch, { glyph: 'down', idleAlpha });
    this.jump = new PixelKey(this, controls.jump.face, KEY_LOOKS.jump, { glyph: 'up', idleAlpha });
    // Pause is always over the picture.
    this.pause = new PixelKey(this, controls.pause.face, KEY_LOOKS.pause, {
      glyph: 'pause',
      idleAlpha: 0.85,
    });
    root.add([
      this.left.container,
      this.right.container,
      this.crouch.container,
      this.jump.container,
      this.pause.container,
    ]);
    this.root = root;
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
