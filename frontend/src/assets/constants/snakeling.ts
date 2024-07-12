import { ACTION } from '@app/data/models/snakeling/Actions';

export const BOARD_WIDTH_MOBILE: number = 14;
export const BOARD_WIDTH: number = 26;
export const BOARD_WIDTH_MEDIUM: number = 29;
export const BOARD_WIDTH_LARGE: number = 32;

export const BOARD_HEIGHT_MOBILE: number = 22;
export const BOARD_HEIGHT: number = 15;
export const BOARD_HEIGHT_LARGE: number = 18;

export const NOT_MOVE: number = 0;
export const NEXT_POSITION: number = 1;
export const PREVIOUS_POSITION: number = -1;

export const FOOD: number = 1;
export const EMPTY_CELL: number = 0;
export const SNAKE: number = 2;

export const ACTIONS: Record<string, ACTION> = {
  ArrowLeft: ACTION.LEFT,
  a: ACTION.LEFT,
  ArrowRight: ACTION.RIGHT,
  d: ACTION.RIGHT,
  ArrowDown: ACTION.DOWN,
  s: ACTION.DOWN,
  p: ACTION.PAUSE,
  Escape: ACTION.PAUSE,
  ArrowUp: ACTION.UP,
  w: ACTION.UP,
};
