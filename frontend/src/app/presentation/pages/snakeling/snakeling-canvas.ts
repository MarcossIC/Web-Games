import { Board, Cell, unwrapBody } from './snake-motion';

/** What the painter needs to draw one frame. Cells are 1-based. */
export interface SnakeFrame {
  /** The body, head first, already placed for this instant. */
  segments: readonly Cell[];
  /** Direction the head is facing: one of x or y is -1 or 1. */
  heading: Cell;
  food: Cell;
  /** True once the game is lost. */
  dead: boolean;
  /** Clock for the idle animations, in milliseconds. */
  time: number;
}

/** A burst of sparks with the points just earned. */
interface Burst {
  at: Cell;
  label: string;
  startedAt: number;
}

type Rgb = readonly [number, number, number];

// The green garden is the identity of this game.
const GRASS_LIGHT = '#abd653';
const GRASS_DARK = '#a3d04a';
const GRASS_BLADE = '#86b436';
const FLOWER = '#fdfbe6';
/** The color of the original dashed fence around the board. */
const FENCE = '#151d00';
const SHADOW = 'rgba(46, 78, 0, 0.38)';

// The serpent wears the colors of the site: magenta at the head, violet
// along the body, cyan at the tail.
const HEAD_COLOR: Rgb = [255, 46, 136];
const BODY_COLOR: Rgb = [183, 139, 255];
const TAIL_COLOR: Rgb = [94, 230, 255];
const DEAD_COLOR: Rgb = [120, 128, 140];
const INK = '#07060d';
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
const TONGUE = '#ffe14a';

const APPLE = '#d81e2c';
const APPLE_OUTLINE = '#7c0f18';
const APPLE_SHINE = '#ff9aa2';
const LEAF = '#2f8f2a';
const STEM = '#5a3a1a';

const BURST_MS = 650;
const BLINK_EVERY_MS = 3400;
const BLINK_MS = 130;
const TONGUE_EVERY_MS = 2600;
const TONGUE_MS = 280;
/** How long the head swells when it bites. */
const CHOMP_MS = 240;
/** Time the bite takes to travel from one plate to the next. */
const SWALLOW_MS_PER_PLATE = 70;

/** Repeatable pseudo-random number in 0..1 for a cell. */
function chance(column: number, row: number, salt: number): number {
  const value = Math.sin(column * 127.1 + row * 311.7 + salt * 74.7) * 43758.5;
  return value - Math.floor(value);
}

function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ];
}

const css = (color: Rgb) =>
  `rgb(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])})`;

/**
 * Draws the Snakeling board on a canvas. It only paints what it is given:
 * the rules of the game live in the snakeling services.
 */
export class SnakelingCanvas {
  private readonly context: CanvasRenderingContext2D;
  /** The garden, painted once per size and reused every frame. */
  private garden: HTMLCanvasElement | null = null;
  private board: Board = { columns: 0, rows: 0 };
  private cell = 0;
  private scale = 1;
  private bursts: Burst[] = [];
  /** When the snake last ate, or -Infinity if it has not yet. */
  private bittenAt = -Infinity;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is not available');
    this.context = context;
  }

  /**
   * Sizes the canvas for a board of `columns` by `rows` cells.
   * @param cell side of a cell in CSS pixels
   * @param pixelRatio device pixels per CSS pixel, for a sharp picture
   */
  resize(board: Board, cell: number, pixelRatio: number): void {
    this.board = board;
    this.cell = cell;
    this.scale = pixelRatio;
    this.canvas.width = Math.round(board.columns * cell * pixelRatio);
    this.canvas.height = Math.round(board.rows * cell * pixelRatio);
    this.canvas.style.width = `${board.columns * cell}px`;
    this.canvas.style.height = `${board.rows * cell}px`;
    this.garden = this.paintGarden();
  }

  /**
   * The snake just ate: sparks and the points earned where it happened,
   * the head swells, and the bite starts travelling down the body.
   */
  bite(at: Cell, label: string, now: number): void {
    this.bursts.push({ at: { x: at.x, y: at.y }, label, startedAt: now });
    this.bittenAt = now;
  }

  draw(frame: SnakeFrame): void {
    if (!this.garden || this.cell === 0) return;
    const { context } = this;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(this.garden, 0, 0);
    context.setTransform(this.scale, 0, 0, this.scale, 0, 0);

    this.drawPortals(frame.time);
    this.drawApple(frame.food, frame.time);
    this.drawSnake(frame);
    this.drawBursts(frame.time);
  }

  /** Center of a 1-based cell, in CSS pixels. */
  private center(cell: Cell): Cell {
    return {
      x: (cell.x - 0.5) * this.cell,
      y: (cell.y - 0.5) * this.cell,
    };
  }

  /** The checkered lawn with a few blades of grass and flowers on it. */
  private paintGarden(): HTMLCanvasElement {
    const { board, cell } = this;
    const garden = document.createElement('canvas');
    garden.width = this.canvas.width;
    garden.height = this.canvas.height;
    const paint = garden.getContext('2d');
    if (!paint) return garden;
    paint.scale(this.scale, this.scale);

    for (let row = 0; row < board.rows; row++) {
      for (let column = 0; column < board.columns; column++) {
        const left = column * cell;
        const top = row * cell;
        paint.fillStyle = (row + column) % 2 === 0 ? GRASS_DARK : GRASS_LIGHT;
        paint.fillRect(left, top, cell, cell);

        // The same cells get grass every time, so the lawn does not
        // change when the window is resized.
        if (chance(column, row, 1) < 0.16) {
          paint.fillStyle = GRASS_BLADE;
          const blade = Math.max(1, Math.round(cell * 0.06));
          for (let i = 0; i < 3; i++) {
            const x = left + cell * (0.25 + chance(column, row, 2 + i) * 0.5);
            const height = cell * (0.14 + chance(column, row, 5 + i) * 0.12);
            const y = top + cell * (0.45 + chance(column, row, 8 + i) * 0.3);
            paint.fillRect(Math.round(x), Math.round(y), blade, height);
          }
        } else if (chance(column, row, 11) < 0.025) {
          const petal = Math.max(2, Math.round(cell * 0.09));
          const x = Math.round(left + cell * 0.5);
          const y = Math.round(top + cell * 0.5);
          paint.fillStyle = FLOWER;
          paint.fillRect(x - petal, y, petal * 3, petal);
          paint.fillRect(x, y - petal, petal, petal * 3);
          paint.fillStyle = '#f4c531';
          paint.fillRect(x, y, petal, petal);
        }
      }
    }
    return garden;
  }

  /**
   * The edges of this board are not walls: the snake goes through and
   * comes back on the other side. The dashes march along the edge so it
   * reads as something you can cross, not something that stops you.
   */
  private drawPortals(time: number): void {
    const { context, cell, board } = this;
    const width = cell * 0.14;
    context.save();
    context.strokeStyle = FENCE;
    context.globalAlpha = 0.5;
    context.lineWidth = width;
    context.lineCap = 'butt';
    context.setLineDash([cell * 0.4, cell * 0.3]);
    context.lineDashOffset = -time / 28;
    context.strokeRect(
      width / 2,
      width / 2,
      board.columns * cell - width,
      board.rows * cell - width
    );
    context.restore();
  }

  private drawApple(food: Cell, time: number): void {
    const { context, cell } = this;
    const at = this.center(food);
    // A slow bob, so the eye finds the apple without it being loud.
    const lift = Math.sin(time / 260) * cell * 0.05;
    const radius = cell * 0.31;
    const y = at.y + lift;

    context.fillStyle = SHADOW;
    context.beginPath();
    context.ellipse(
      at.x,
      at.y + cell * 0.36,
      radius * 0.8,
      radius * 0.26,
      0,
      0,
      Math.PI * 2
    );
    context.fill();

    context.fillStyle = APPLE;
    context.strokeStyle = APPLE_OUTLINE;
    context.lineWidth = cell * 0.06;
    context.beginPath();
    context.arc(at.x, y + cell * 0.04, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.fillStyle = APPLE_SHINE;
    context.beginPath();
    context.arc(
      at.x - radius * 0.38,
      y - radius * 0.2,
      radius * 0.2,
      0,
      Math.PI * 2
    );
    context.fill();

    context.strokeStyle = STEM;
    context.lineWidth = cell * 0.06;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(at.x, y - radius * 0.75);
    context.lineTo(at.x + cell * 0.04, y - radius * 1.2);
    context.stroke();

    context.fillStyle = LEAF;
    context.beginPath();
    context.ellipse(
      at.x + cell * 0.14,
      y - radius * 1.05,
      cell * 0.12,
      cell * 0.06,
      -0.5,
      0,
      Math.PI * 2
    );
    context.fill();
  }

  /**
   * Draws the snake, and draws it again one board over wherever it runs
   * past an edge, which is what shows it leaving one side while it comes
   * in on the other.
   */
  private drawSnake(frame: SnakeFrame): void {
    if (frame.segments.length === 0) return;
    const { context, cell, board } = this;
    const line = unwrapBody(frame.segments, board);

    // One cell of margin covers the size of the plates themselves.
    const xs = line.map((segment) => segment.x);
    const ys = line.map((segment) => segment.y);
    const left = Math.min(...xs) - 1;
    const right = Math.max(...xs) + 1;
    const top = Math.min(...ys) - 1;
    const bottom = Math.max(...ys) + 1;

    for (const shiftX of [-board.columns, 0, board.columns]) {
      for (const shiftY of [-board.rows, 0, board.rows]) {
        const visible =
          right + shiftX > 0 &&
          left + shiftX < board.columns + 1 &&
          bottom + shiftY > 0 &&
          top + shiftY < board.rows + 1;
        if (!visible) continue;

        context.save();
        context.translate(shiftX * cell, shiftY * cell);
        this.drawSnakeOnce(line, frame);
        context.restore();
      }
    }
  }

  /** Side of the plate at a segment, as a fraction of a cell. */
  private plateSize(index: number, count: number, time: number): number {
    let size = 0.82;
    if (index === 0) {
      // The head is the largest plate, and swells for a moment on a bite.
      const chomp = (time - this.bittenAt) / CHOMP_MS;
      size = 0.96 + (chomp >= 0 && chomp < 1 ? 0.2 * Math.sin(Math.PI * chomp) : 0);
    } else if (count > 3 && index === count - 1) {
      size = 0.52;
    } else if (count > 3 && index === count - 2) {
      size = 0.68;
    }
    return size * (1 + 0.16 * this.swallow(index, time));
  }

  /**
   * How much of the last bite is at a segment, 0 to 1. The bite travels
   * from the head to the tail, one plate after another.
   */
  private swallow(index: number, time: number): number {
    if (index === 0) return 0;
    const reached = (time - this.bittenAt) / SWALLOW_MS_PER_PLATE;
    return Math.max(0, 1 - Math.abs(index - reached));
  }

  /** Color of the plate at a segment: magenta, through violet, to cyan. */
  private plateColor(index: number, count: number, frame: SnakeFrame): Rgb {
    if (frame.dead) return DEAD_COLOR;
    const along = count <= 1 ? 0 : index / (count - 1);
    const base =
      along < 0.5
        ? mix(HEAD_COLOR, BODY_COLOR, along * 2)
        : mix(BODY_COLOR, TAIL_COLOR, (along - 0.5) * 2);
    // The plate carrying the bite lights up.
    return mix(base, WHITE, 0.6 * this.swallow(index, frame.time));
  }

  /**
   * The body is a chain of square plates joined by narrower links, like
   * an arcade sprite: drawn as its shadow on the grass, then its dark
   * outline, then the colored plates with a lit edge and a shaded edge.
   */
  private drawSnakeOnce(line: readonly Cell[], frame: SnakeFrame): void {
    const { context, cell } = this;
    const count = line.length;
    const plates = line.map((segment, index) => ({
      at: this.center(segment),
      size: this.plateSize(index, count, frame.time) * cell,
      color: this.plateColor(index, count, frame),
    }));
    const outline = cell * 0.07;

    const square = (x: number, y: number, size: number) =>
      context.fillRect(x - size / 2, y - size / 2, size, size);
    /** The link between a plate and the one ahead of it. */
    const link = (index: number, grow: number, dropY: number) => {
      const from = plates[index];
      const to = plates[index - 1];
      const thickness = Math.min(from.size, to.size) * 0.62 + grow;
      const left = Math.min(from.at.x, to.at.x) - thickness / 2;
      const top = Math.min(from.at.y, to.at.y) - thickness / 2 + dropY;
      context.fillRect(
        left,
        top,
        Math.abs(from.at.x - to.at.x) + thickness,
        Math.abs(from.at.y - to.at.y) + thickness
      );
    };

    // Shadow, then outline: each pass covers the whole body before the
    // next begins, so no plate's outline cuts across its neighbour.
    context.fillStyle = SHADOW;
    for (let i = count - 1; i >= 0; i--) {
      if (i > 0) link(i, 0, cell * 0.16);
      square(plates[i].at.x, plates[i].at.y + cell * 0.16, plates[i].size);
    }
    context.fillStyle = INK;
    for (let i = count - 1; i >= 0; i--) {
      if (i > 0) link(i, outline * 2, 0);
      square(plates[i].at.x, plates[i].at.y, plates[i].size + outline * 2);
    }

    // Links are darker than the plates, which is what makes the body
    // read as separate plates and not one bar.
    for (let i = count - 1; i > 0; i--) {
      context.fillStyle = css(mix(plates[i].color, BLACK, 0.3));
      link(i, 0, 0);
    }

    // Tail first, so the plates nearer the head lie on top.
    for (let i = count - 1; i >= 0; i--) {
      const { at, size, color } = plates[i];
      const edge = size * 0.16;
      const left = at.x - size / 2;
      const top = at.y - size / 2;

      context.fillStyle = css(color);
      context.fillRect(left, top, size, size);
      // Lit from the top left, like the Tetris blocks.
      context.fillStyle = css(mix(color, WHITE, 0.42));
      context.fillRect(left, top, size, edge);
      context.fillRect(left, top, edge, size);
      context.fillStyle = css(mix(color, BLACK, 0.28));
      context.fillRect(left, top + size - edge, size, edge);
      context.fillRect(left + size - edge, top, edge, size);
    }

    this.drawFace(plates[0].at, plates[0].size, frame);
  }

  /** Eyes and tongue, in square pixels to match the plates. */
  private drawFace(at: Cell, size: number, frame: SnakeFrame): void {
    const { context, cell } = this;
    const { heading, time, dead } = frame;
    const square = (x: number, y: number, side: number) =>
      context.fillRect(x - side / 2, y - side / 2, side, side);

    // The tongue comes out now and then: a stem and a forked tip.
    if (!dead && time % TONGUE_EVERY_MS < TONGUE_MS) {
      const pixel = cell * 0.1;
      const reach = size / 2 + pixel;
      context.fillStyle = TONGUE;
      for (let step = 0; step < 2; step++) {
        square(
          at.x + heading.x * (reach + step * pixel),
          at.y + heading.y * (reach + step * pixel),
          pixel
        );
      }
      for (const side of [-1, 1]) {
        square(
          at.x + heading.x * (reach + 2 * pixel) - heading.y * pixel * side,
          at.y + heading.y * (reach + 2 * pixel) + heading.x * pixel * side,
          pixel
        );
      }
    }

    // Two eyes, pushed towards where the head is going and spread to the
    // sides of that direction.
    const forward = size * 0.14;
    const apart = size * 0.24;
    const eye = size * 0.26;
    const blinking = !dead && time % BLINK_EVERY_MS < BLINK_MS;
    for (const side of [-1, 1]) {
      const eyeX = at.x + heading.x * forward - heading.y * apart * side;
      const eyeY = at.y + heading.y * forward + heading.x * apart * side;

      if (dead) {
        // Crossed-out eyes, in five pixels.
        const pixel = eye / 3;
        context.fillStyle = INK;
        for (const [dx, dy] of [
          [-1, -1],
          [1, -1],
          [0, 0],
          [-1, 1],
          [1, 1],
        ]) {
          square(eyeX + dx * pixel, eyeY + dy * pixel, pixel);
        }
        continue;
      }
      if (blinking) {
        // A closed eye: a flat bar across the direction of travel.
        context.fillStyle = INK;
        context.fillRect(
          eyeX - (Math.abs(heading.y) * eye + Math.abs(heading.x) * eye * 0.3) / 2,
          eyeY - (Math.abs(heading.x) * eye + Math.abs(heading.y) * eye * 0.3) / 2,
          Math.abs(heading.y) * eye + Math.abs(heading.x) * eye * 0.3,
          Math.abs(heading.x) * eye + Math.abs(heading.y) * eye * 0.3
        );
        continue;
      }

      context.fillStyle = '#fff';
      square(eyeX, eyeY, eye);
      // The pupil sits on the forward half of the eye: it looks ahead.
      context.fillStyle = INK;
      square(
        eyeX + heading.x * eye * 0.22,
        eyeY + heading.y * eye * 0.22,
        eye * 0.52
      );
    }
  }

  private drawBursts(time: number): void {
    const { context, cell } = this;
    this.bursts = this.bursts.filter(
      (burst) => time - burst.startedAt < BURST_MS
    );

    for (const burst of this.bursts) {
      const t = (time - burst.startedAt) / BURST_MS;
      // Fast at first, then settling: the sparks fly out and hang.
      const out = 1 - Math.pow(1 - t, 3);
      const at = this.center(burst.at);

      context.save();
      context.globalAlpha = 1 - t;

      const spark = cell * 0.16 * (1 - t * 0.6);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const distance = cell * (0.4 + out * 1.1);
        context.fillStyle = i % 2 === 0 ? '#fff' : '#ffe14a';
        context.fillRect(
          at.x + Math.cos(angle) * distance - spark / 2,
          at.y + Math.sin(angle) * distance - spark / 2,
          spark,
          spark
        );
      }

      context.font = `${Math.round(cell * 0.6)}px Silkscreen, monospace`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.lineWidth = cell * 0.12;
      context.strokeStyle = FENCE;
      context.fillStyle = '#fff';
      const labelY = at.y - cell * (0.7 + out * 0.9);
      context.strokeText(burst.label, at.x, labelY);
      context.fillText(burst.label, at.x, labelY);

      context.restore();
    }
  }
}
