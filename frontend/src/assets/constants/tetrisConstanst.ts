import { ACTION } from "@app/data/models/tetris/MoveDirections.enum";
import { Piece } from "@app/data/models/tetris/Piece";
import { PieceColor } from "@app/data/models/tetris/PieceColor";
import { PieceType } from "@app/data/models/tetris/PieceType.enum";

export const BLOCK_SIZE: number = 25;
export const BLOCK_SIZE_LARGE: number = 40;

export const BOARD_MOBILE_WIDTH: number = 10;
export const BOARD_WIDTH: number = 12;
export const BOARD_LARGE_WIDTH: number = 14;

export const BOARD_MOBILE_HEIGHT: number = 16;
export const BOARD_HEIGHT: number = 22;
export const BOARD_LARGE_HEIGHT: number = 24;



export const NEXT_PIECE_SIZE_NORMAL = 18;
export const NEXT_PIECE_SIZE_LARGE = 30;

export const NEXT_PIECE_SIZE: number = (window.innerWidth > 1500) ? NEXT_PIECE_SIZE_LARGE : NEXT_PIECE_SIZE_NORMAL;

export const NEXT_PIECE_WIDTH: number = 5;
export const NEXT_PIECE_HEIGHT: number = 5;

export const LINE_WIDTH_SCALE = 0.01;
export const SHADOW_BLUR_SCALE = 1;
export const NEXT_POSITION = 1;

export const BLOCK_SIZE_SCREEN = (window.innerWidth > 1500) ? BLOCK_SIZE_LARGE : BLOCK_SIZE;

export const BOARD_WIDTH_SCREEN = (window.innerWidth <= 500) ? BOARD_MOBILE_WIDTH : 
                (window.innerWidth > 1500) ? BOARD_LARGE_WIDTH : BOARD_WIDTH;

export const BOARD_HEIGHT_SCREEN = (window.innerWidth <= 500) ? BOARD_MOBILE_HEIGHT : 
                  (window.innerWidth > 1500) ? BOARD_LARGE_HEIGHT : BOARD_HEIGHT;

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

  //Mapa que: Define la paleta de coloresde las piezas
  export const ALL_COLOR_PIECE: Record<number, PieceColor> = {
    1: {fill: "#FEEA67", stroke: "#6E5E20"},
    2: {fill: "#79FEFF", stroke: "#40666E"},
    3: {fill: "#FC7382", stroke: "#6E3D42"},
    4: {fill: "#6FFC73", stroke: "#345C3D"},
    5: {fill: "#6699FE", stroke: "#384066"},
    6: {fill: "#E99D2A", stroke: "#A06A34"},
    7: {fill: "#9257C8", stroke: "#38294A"}
  };


export const SIZE_SQUARE_IN_BOARD: number = 1;

export const SPEED_PER_LEVEL: Record<number, number> = {
  1: 900,
  2: 500,
  3: 300,
  4: 100
};

export const DEFAULT_PIECE: Piece = {shape: [[]], type: PieceType.SQUARE, position: {x: 0, y: 0}, color: {fill: "", stroke: ""}, isMovable: true};