import { SnakelingMode } from '@app/data/models/snakeling/Mode';

export const BOARD_WIDTH_MOBILE: number = 14;
export const BOARD_WIDTH: number = 26;
export const BOARD_WIDTH_MEDIUM: number = 29;
export const BOARD_WIDTH_LARGE: number = 32;

/** Fallback for phones; the real count fills the screen's height. */
export const BOARD_HEIGHT_MOBILE: number = 22;
export const BOARD_HEIGHT_MOBILE_MIN: number = 16;
export const BOARD_HEIGHT_MOBILE_MAX: number = 32;
export const BOARD_HEIGHT: number = 15;
export const BOARD_HEIGHT_LARGE: number = 18;

/** Frame, outline and shadow the stylesheet draws around the board. */
export const SNAKE_FRAME_PX: number = 32;
export const SNAKE_FRAME_PX_MOBILE: number = 16;
/** Side padding of the play area on phones, both sides together. */
export const SNAKE_SIDE_PADDING_MOBILE: number = 16;
/**
 * Height of everything on a phone that is not the board: the game bar,
 * the readouts, the combo meter, the gaps and paddings, and the frame.
 */
export const SNAKE_CHROME_HEIGHT_MOBILE: number = 186;

export const NOT_MOVE: number = 0;
export const NEXT_POSITION: number = 1;
export const PREVIOUS_POSITION: number = -1;

export const FOOD: number = 1;
export const EMPTY_CELL: number = 0;
export const SNAKE: number = 2;

export interface SnakelingModeInfo {
  id: SnakelingMode;
  name: string;
  /** A few words on the mode's card. */
  tagline: string;
  /** The full rule, on the How to play page. */
  rule: string;
}

/** The modes, in the order the menu offers them. */
export const SNAKELING_MODES: readonly SnakelingModeInfo[] = [
  {
    id: 'classic',
    name: 'Classic',
    tagline: 'Walls are deadly',
    rule: 'The edges are walls: run into one and the game is over.',
  },
  {
    id: 'portal',
    name: 'Portal',
    tagline: 'No walls',
    rule: 'No walls: leave on one side and come back on the other.',
  },
  {
    id: 'time',
    name: 'Time Attack',
    tagline: 'One minute, top score',
    rule: 'You have one minute to score as much as you can. Walls are deadly, like Classic.',
  },
  {
    id: 'hard',
    name: 'Hard',
    tagline: 'Rocks rise and sink',
    rule: 'Walls are deadly, like Classic, and rocks rise around the board. A rock shows faint first, then turns solid: hit a solid one and the game is over. After a while it sinks and rises somewhere else. More apples, more rocks.',
  },
];
