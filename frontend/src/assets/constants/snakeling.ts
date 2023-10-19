import { ACTION } from "@app/data/models/snakeling/Actions";


export const BOARD_WIDTH_MOBILE = 14;
export const BOARD_WIDTH = 26;
export const BOARD_WIDTH_MEDIUM = 29;
export const BOARD_WIDTH_LARGE = 32;

export const BOARD_HEIGHT_MOBILE = 22;
export const BOARD_HEIGHT = 15;
export const BOARD_HEIGHT_LARGE = 18;

export const BOARD_WIDTH_SCREEN = (window.innerWidth > 1500) 
            ? BOARD_WIDTH_LARGE : 
            (window.innerWidth > 900) ? 
                BOARD_WIDTH_MEDIUM : 
                (window.innerWidth > 600) ? 
                BOARD_WIDTH : 
                BOARD_WIDTH_MOBILE;

export const BOARD_HEIGHT_SCREEN = (window.innerWidth > 1500 ) 
                                    ? BOARD_HEIGHT_LARGE : 
                                    (window.innerWidth > 600) 
                                            ? BOARD_HEIGHT : BOARD_HEIGHT_MOBILE;


export const NOT_MOVE = 0;
export const NEXT_POSITION = 1;
export const PREVIOUS_POSITION = -1;


export const FOOD = 1;
export const EMPTY_CELL = 0;
export const SNAKE = 2;

export const ACTIONS: Record<string, ACTION> = {
    "ArrowLeft": ACTION.LEFT,
    "a": ACTION.LEFT,
    "ArrowRight": ACTION.RIGHT,
    "d": ACTION.RIGHT,
    "ArrowDown": ACTION.DOWN,
    "s": ACTION.DOWN,
    "p": ACTION.PAUSE,
    "Escape": ACTION.PAUSE,
    "ArrowUp": ACTION.UP,
    "w": ACTION.UP
};



