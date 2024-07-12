import { inject, Injectable, signal } from '@angular/core';
import { DEFAULT_COLOR } from '../../../../assets/constants/tetrisConstanst';
import { Piece } from '@app/data/models/tetris/Piece';
import { PointsService } from './Points.service';
import { fillArray, fillMatrix } from '../util.service';
import { BoardSizeService } from '@app/data/services/BoardSize.service';

@Injectable()
export class BoardService {
  private _board = signal<number[][]>([]);
  private boardSize = inject(BoardSizeService);
  private points = inject(PointsService);

  constructor() {
    this.boardSize.typeToTetris();
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

    let score = this.points.score;
    let level;
    if (score < 500) level = 1;
    else if (score >= 500 && score < 1000) level = 2;
    else if (score >= 1000 && score < 1500) level = 3;
    else level = 4;
    this.points.updateLevel(level);
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
}
