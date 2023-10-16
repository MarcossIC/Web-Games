import { ACTION } from "@app/data/models/tetris/MoveDirections.enum";
import { PieceColor } from "@app/data/models/tetris/PieceColor";

export const BLOCK_SIZE: number = 25;
export const BLOCK_MOBILE_SIZE: number = 20;

export const BOARD_WIDTH: number = 12;
export const BOARD_MOBILE_WIDTH: number = 10;

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

  export const ALL_SQUARE_IMG: Record<number, string> = {
    1: '../../../../assets/images/tetris/yellow_square.webp',
    2: '../../../../assets/images/tetris/skyblue_square.webp',
    3: '../../../../assets/images/tetris/red_square.webp',
    4: '../../../../assets/images/tetris/green_square.webp',
    5: '../../../../assets/images/tetris/blue_square.webp',
    6: '../../../../assets/images/tetris/orange_square.webp',
    7: '../../../../assets/images/tetris/violet_square.webp'
  };



  export function ramdomNumber(includeZero: boolean, maxNumber: number){
    const num = includeZero ? 0 : 1;
    return Math.floor(Math.random() * maxNumber) + num;
  }

export const SIZE_SQUARE_IN_BOARD: number = 1;


export const LEVELS: Record<number, number> = {
  1: 900,
  2: 700,
  3: 500,
  4: 300
};