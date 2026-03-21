import { inject, Injectable, signal } from '@angular/core';
import {
  DEFAULT_COLOR,
  NEXT_POSITION,
} from '../../../../assets/constants/tetrisConstanst';
import { Piece } from '@app/data/models/tetris/Piece';
import { ACTION } from '@app/data/models/tetris/MoveDirections.enum';
import { PointsService } from './Points.service';
import { fillArray, fillMatrix } from '../util.service';
import { BoardSizeService } from '@app/data/services/BoardSize.service';

@Injectable()
export class BoardService {
  private _board = signal<number[][]>([]);
  private boardSize = inject(BoardSizeService);
  private points = inject(PointsService);

  constructor() {
    this._board.set(
      fillMatrix(this.boardSize.WIDTH, this.boardSize.HEIGHT, 0) as number[][]
    );
  }

  // Reiniciar el tablero
  public reset(): void {
    this._board.set(
      fillMatrix(this.boardSize.WIDTH, this.boardSize.HEIGHT, 0) as number[][]
    );
  }

  /**
   * Dibuja el tablero de juego en el canvas.
   *
   * @param context - El contexto 2D del canvas donde se dibujará el tablero.
   * @param width - El ancho del canvas en píxeles.
   * @param height - La altura del canvas en píxeles.
   *
   * Primero dibuja un fondo negro, luego recorre el tablero y
   * dibuja cada celda ocupada con el color predeterminado.
   */
  public drawBoard(
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);

    this._board().forEach((row, x) => {
      row.forEach((value, y) => {
        if (value > 0) {
          // Configuración
          context.fillStyle = DEFAULT_COLOR.fill;
          context.strokeStyle = DEFAULT_COLOR.stroke;

          // Dibujando
          context.fillRect(y, x, 1, 1);
          context.strokeRect(y, x, 1, 1);
        }
      });
    });
  }

  public solidifyPieceInBoard(piece: Piece): void {
    const boardCopy = this._board().map((row) => [...row]);
    piece.shape.forEach((row, x) => {
      row.forEach((value, y) => {
        if (value > 0) {
          boardCopy[y + piece.position.y][x + piece.position.x] = 1;
        }
      });
    });
    this._board.set(boardCopy);
  }

  /**
   * Verifica líneas completas, actualiza el tablero y la puntuación.
   *
   * Elimina las líneas completas, añade nuevas líneas vacías,
   * incrementa la puntuación y actualiza el nivel del juego.
   *
   * @returns El nuevo nivel del juego basado en la puntuación actual.
   */
  public updateBoardAndScore(): number {
    const boardCopy = this._board().map((row) => [...row]);
    boardCopy.forEach((row, rowX) => {
      if (row.every((cell) => cell > 0)) {
        this.removeLine(boardCopy, rowX);
        this.addNewEmptyLine(boardCopy);
        this.points.addScore();
      }
    });

    this._board.set(boardCopy);

    const level = this.points.calculateLevel();
    this.points.updateMaxPoints();
    return level;
  }

  private removeLine(board: number[][], line: number): void {
    board.splice(line, 1);
  }

  private addNewEmptyLine(board: number[][]): void {
    board.unshift(fillArray(this.boardSize.WIDTH, 0));
  }

  public get board(): number[][] {
    return this._board();
  }

  public detectedACollision(piece: Piece, direction: ACTION): boolean {
    const { x, y } = piece.position;

    for (let rowX = 0; rowX < piece.shape.length; rowX++) {
      for (let cellY = 0; cellY < piece.shape[rowX].length; cellY++) {
        const cell = piece.shape[rowX][cellY];
        const boardX = x + rowX;
        const boardY = y + cellY;

        let isOutOfBounds = false;
        let isOccupied = false;

        if (direction === ACTION.RIGHT) {
          isOutOfBounds = boardX + NEXT_POSITION >= this.boardSize.WIDTH;
          isOccupied =
            !isOutOfBounds &&
            this._board()[boardY][boardX + NEXT_POSITION] > 0;
        } else if (direction === ACTION.LEFT) {
          isOutOfBounds = boardX - NEXT_POSITION < 0;
          isOccupied =
            !isOutOfBounds &&
            this._board()[boardY][boardX - NEXT_POSITION] > 0;
        } else if (direction === ACTION.DOWN) {
          isOutOfBounds = boardY + NEXT_POSITION >= this.boardSize.HEIGHT;
          isOccupied =
            !isOutOfBounds &&
            this._board()[boardY + NEXT_POSITION][boardX] > 0;
        }

        if (cell === 1 && (isOutOfBounds || isOccupied)) {
          return true;
        }
      }
    }

    return false;
  }

  public isWithinBoardLimits(
    x: number,
    y: number,
    shape: number[][]
  ): boolean {
    const pieceWidth = shape[0].length;
    const pieceHeight = shape.length;

    const isWithinLeftAndTop = x >= 0 && y >= 0;
    const isWithinRight = x + pieceWidth <= this.boardSize.WIDTH;
    const isWithinBottom = y + pieceHeight <= this.boardSize.HEIGHT;

    return isWithinLeftAndTop && isWithinRight && isWithinBottom;
  }

  public doesRotationCollide(
    rotated: number[][],
    piecePosition: { x: number; y: number }
  ): boolean {
    const { x, y } = piecePosition;

    return rotated.some((row, rowX) =>
      row.some((cell, cellY) => {
        const boardX = rowX + x;
        const boardY = y + cellY;

        const isOutOfBounds =
          boardY >= this.boardSize.HEIGHT ||
          boardX < 0 ||
          boardX >= this.boardSize.WIDTH;

        const isOccupied = this._board()[boardY][boardX] === 1;

        return isOutOfBounds || isOccupied;
      })
    );
  }

  public drawPiece(context: CanvasRenderingContext2D, piece: Piece): void {
    piece.shape.forEach((row, x) => {
      row.forEach((value, y) => {
        if (value > 0) {
          context.fillStyle = piece.color.fill;
          context.strokeStyle = piece.color.stroke;

          let boardX = x + piece.position.x;
          let boardY = y + piece.position.y;

          context.fillRect(boardX, boardY, 1, 1);
          context.strokeRect(boardX, boardY, 1, 1);
        }
      });
    });
  }
}
