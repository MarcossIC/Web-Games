import { ACTION } from "@app/data/models/tetris/MoveDirections.enum";
import { PieceColor } from "@app/data/models/tetris/PieceColor";

export const BLOCK_SIZE: number = 25;
export const BLOCK_MOBILE_SIZE: number = 22;

export const BOARD_WIDTH: number = 12;
export const BOARD_MOBILE_WIDTH: number = 12;

export const BOARD_HEIGHT: number = 22;
export const BOARD_MOBILE_HEIGHT: number = 20;

export const NEXT_PIECE_SIZE: number = 18;

export const NEXT_PIECE_WIDTH: number = 5;
export const NEXT_PIECE_HEIGHT: number = 5;



export const LINE_WIDTH_SCALE = 0.01;
export const SHADOW_BLUR_SCALE = 1;
export const NEXT_POSITION = 1;

export const BLOCK_SIZE_SCREEN = (window.innerWidth <= 500) ? BLOCK_MOBILE_SIZE : BLOCK_SIZE;
export const BOARD_WIDTH_SCREEN = (window.innerWidth <= 500) ? BOARD_MOBILE_WIDTH : BOARD_WIDTH;
export const BOARD_HEIGHT_SCREEN = (window.innerWidth <= 500) ? BOARD_MOBILE_HEIGHT : BOARD_HEIGHT;


console.log(BOARD_WIDTH_SCREEN);

export const ACTIONS: Record<string, ACTION> = {
    "ArrowLeft": ACTION.LEFT,
    "a": ACTION.LEFT,
    "ArrowRight": ACTION.RIGHT,
    "d": ACTION.RIGHT,
    "ArrowDown": ACTION.DOWN,
    "s": ACTION.DOWN,
    "p": ACTION.PAUSE,
    "Escape": ACTION.PAUSE,
    "ArrowUp": ACTION.ROTATE,
    "w": ACTION.ROTATE
};


export const DEFAULT_COLOR: PieceColor = {
    fill: "#FEEA67",
    stroke: "#6E5E20"
};



