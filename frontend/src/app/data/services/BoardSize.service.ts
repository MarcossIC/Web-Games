import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { WINDOW } from '@app/data/services/Window.service';
import {
  BOARD_HEIGHT as B_SNAKE_HEIGHT,
  BOARD_HEIGHT_MOBILE as B_SNAKE_HEIGHT_MOBILE,
  BOARD_HEIGHT_LARGE as B_SNAKE_HEIGHT_LARGE,
  BOARD_WIDTH as B_SNAKE_WIDTH,
  BOARD_WIDTH_MOBILE as B_SNAKE_WIDTH_MOBILE,
  BOARD_WIDTH_MEDIUM as B_SNAKE_WIDTH_MEDIUM,
  BOARD_WIDTH_LARGE as B_SNAKE_WIDTH_LARGE,
} from 'assets/constants/snakeling';
import {
  BLOCK_SIZE,
  BLOCK_SIZE_LARGE,
  BOARD_HEIGHT as B_TETRIS_HEIGHT,
  BOARD_LARGE_HEIGHT as B_TETRIS_LARGE_HEIGHT,
  BOARD_LARGE_WIDTH as B_TETRIS_LARGE_WIDTH,
  BOARD_MOBILE_HEIGHT as B_TETRIS_MOBILE_HEIGHT,
  BOARD_MOBILE_WIDTH as B_TETRIS_MOBILE_WIDTH,
  BOARD_WIDTH as B_TETRIS_WIDTH,
  NEXT_PIECE_SIZE_LARGE,
  NEXT_PIECE_SIZE_NORMAL,
} from 'assets/constants/tetrisConstanst';

enum GameType {
  TETRIS,
  SNAKE,
}

@Injectable({ providedIn: 'root' })
export class BoardSizeService {
  private readonly PLATFORM = inject(PLATFORM_ID);
  private readonly WINDOW = inject(WINDOW);
  private gameType = GameType.TETRIS;

  private width = 10;
  private height = 10;
  private block = 10;
  private pieceSize = 10;

  constructor() {
    this.changeBoardSize();
  }

  private changeBoardSize() {
    const isTetris = this.gameType === GameType.TETRIS;

    if (isPlatformBrowser(this.PLATFORM)) {
      this.width = isTetris
        ? this.getTetrisBoardWidth()
        : this.getSnakeBoardWidth();

      this.height = isTetris
        ? this.getTetrisBoardHeight()
        : this.getSnakeBoardHeight();
      this.block = this.getBlockSize();
      this.pieceSize = this.getPieceSize();
    } else {
      this.width = this.getDefaultWidth(isTetris);
      this.height = this.getDefaultHeight(isTetris);
      this.block = 25;
      this.pieceSize = 18;
    }
    //this.cdr.detectChanges();
  }
  private getDefaultWidth(isTetris: boolean) {
    return isTetris ? 12 : 26;
  }
  private getDefaultHeight(isTetris: boolean) {
    return isTetris ? 22 : 15;
  }
  private getSnakeBoardWidth() {
    return window.innerWidth > 1500
      ? B_SNAKE_WIDTH_LARGE
      : window.innerWidth > 900
      ? B_SNAKE_WIDTH_MEDIUM
      : window.innerWidth > 600
      ? B_SNAKE_WIDTH
      : B_SNAKE_WIDTH_MOBILE;
  }
  private getTetrisBoardWidth() {
    return window.innerWidth <= 500
      ? B_TETRIS_MOBILE_WIDTH
      : window.innerWidth > 1500
      ? B_TETRIS_LARGE_WIDTH
      : B_TETRIS_WIDTH;
  }
  private getSnakeBoardHeight() {
    return window.innerWidth > 1500
      ? B_SNAKE_HEIGHT_LARGE
      : window.innerWidth > 600
      ? B_SNAKE_HEIGHT
      : B_SNAKE_HEIGHT_MOBILE;
  }
  private getTetrisBoardHeight() {
    return window.innerWidth <= 500
      ? B_TETRIS_MOBILE_HEIGHT
      : window.innerWidth > 1500
      ? B_TETRIS_LARGE_HEIGHT
      : B_TETRIS_HEIGHT;
  }

  private getBlockSize() {
    return window.innerWidth > 1500 ? BLOCK_SIZE_LARGE : BLOCK_SIZE;
  }
  private getPieceSize() {
    return window.innerWidth > 1500
      ? NEXT_PIECE_SIZE_LARGE
      : NEXT_PIECE_SIZE_NORMAL;
  }

  public typeToTetris() {
    this.gameType = GameType.TETRIS;
    this.changeBoardSize();
  }
  public typeToSnake() {
    this.gameType = GameType.SNAKE;
    this.changeBoardSize();
  }

  public get WIDTH() {
    return this.width;
  }
  public get HEIGHT() {
    return this.height;
  }
  public get BLOCK() {
    return this.block;
  }
  public get PIECE_SIZE() {
    return this.pieceSize;
  }
}
