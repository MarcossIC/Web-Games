import { Injectable, signal } from '@angular/core';
import { GameStatus } from '@app/data/models/tictactoe/GameStatus.enum';
import { Player } from '@app/data/models/tictactoe/Player.enum';

@Injectable()
export class BoardStateService {
  private _gameStatus = signal(GameStatus.WAITING);

  public countEmptyCell(board: string[][]): number {
    return board.flat().filter((cell) => cell === '0').length;
  }

  /**
   * Verifica si hay una línea completa en las filas del tablero.
   *
   * Esta función examina cada fila del tablero para determinar si todas las celdas
   * en una fila contienen el mismo símbolo ('X' u 'O'), lo que indicaría una victoria.
   *
   * @private
   * @param {string[][]} board - El tablero de juego representado como una matriz bidimensional.
   * @returns {boolean} Retorna true si se encuentra una fila completa, false en caso contrario.
   */
  private checkRowsForWinner(board: string[][]): boolean {
    const boardLength = board.length;

    for (let rowIndex = 0; rowIndex < boardLength; rowIndex++) {
      // Verifica si todas las celdas en la fila actual son 'X'
      if (board[rowIndex].every((cell) => cell === 'X')) {
        this.gameResult = GameStatus.X_WON;
        return true;
      }

      // Verifica si todas las celdas en la fila actual son 'O'
      if (board[rowIndex].every((cell) => cell === 'O')) {
        this.gameResult = GameStatus.O_WON;
        return true;
      }
    }

    // Si no se encuentra ninguna fila completa
    return false;
  }

  /**
   * Verifica si hay un ganador en las columnas del tablero.
   *
   * Esta función examina cada columna del tablero para determinar si todas las celdas
   * en una columna contienen el mismo símbolo ('X' u 'O'), lo que indicaría una victoria.
   *
   * @private
   * @param {string[][]} board - El tablero de juego representado como una matriz bidimensional.
   * @returns {boolean} Retorna true si se encuentra una columna ganadora, false en caso contrario.
   */
  private checkColumnsForWinner(board: string[][]): boolean {
    const boardLength = board.length;

    for (let columnIndex = 0; columnIndex < boardLength; columnIndex++) {
      let countXColumns = 0;
      let countOColumns = 0;

      for (let rowIndex = 0; rowIndex < boardLength; rowIndex++) {
        if (board[rowIndex][columnIndex] === 'X') countXColumns++;
        else if (board[rowIndex][columnIndex] === 'O') countOColumns++;
      }

      // Si todas las celdas en la columna son 'X'
      if (countXColumns === boardLength) {
        this.gameResult = GameStatus.X_WON;
        return true;
      }

      // Si todas las celdas en la columna son 'O'
      if (countOColumns === boardLength) {
        this.gameResult = GameStatus.O_WON;
        return true;
      }
    }

    // Si no se encuentra ninguna columna ganadora
    return false;
  }

  /**
   * Verifica si hay un ganador en las diagonales del tablero.
   *
   * Esta función examina ambas diagonales del tablero (de izquierda a derecha y de derecha a izquierda)
   * para determinar si todas las celdas en una diagonal contienen el mismo símbolo ('X' u 'O'),
   * lo que indicaría una victoria.
   *
   * @private
   * @param {string[][]} board - El tablero de juego representado como una matriz bidimensional.
   * @returns {boolean} Retorna true si se encuentra una diagonal ganadora, false en caso contrario.
   */
  private checkDiagonalsForWinner(board: string[][]): boolean {
    const boardSize = board.length;

    let mainDiagonalSymbol = board[0][0];
    let antiDiagonalSymbol = board[0][boardSize - 1];
    let mainDiagonalComplete = true;
    let antiDiagonalComplete = true;

    for (let i = 0; i < boardSize; i++) {
      // Verifica la diagonal principal (de izquierda a derecha)
      if (board[i][i] !== mainDiagonalSymbol || mainDiagonalSymbol === '0') {
        mainDiagonalComplete = false;
      }

      // Verifica la diagonal secundaria (de derecha a izquierda)
      if (
        board[i][boardSize - 1 - i] !== antiDiagonalSymbol ||
        antiDiagonalSymbol === '0'
      ) {
        antiDiagonalComplete = false;
      }

      // Si ambas diagonales ya no son completas, no hay necesidad de seguir verificando
      if (!mainDiagonalComplete && !antiDiagonalComplete) {
        break;
      }
    }

    // Verifica si hay un ganador en alguna diagonal
    if (mainDiagonalComplete && mainDiagonalSymbol !== '0') {
      this.gameResult =
        mainDiagonalSymbol === 'X' ? GameStatus.X_WON : GameStatus.O_WON;
      return true;
    }

    if (antiDiagonalComplete && antiDiagonalSymbol !== '0') {
      this.gameResult =
        antiDiagonalSymbol === 'X' ? GameStatus.X_WON : GameStatus.O_WON;
      return true;
    }

    return false;
  }

  public checkBoardForWinner(board: string[][]): boolean {
    return (
      this.checkColumnsForWinner(board) ||
      this.checkDiagonalsForWinner(board) ||
      this.checkRowsForWinner(board)
    );
  }

  /**
   * Evalúa el estado actual del tablero para determinar la puntuación según la perspectiva del jugador.
   *
   * Se considera si el juego se ha ganado, se ha perdido o si es un empate.
   * Por defecto da una puntuacion si ninguna condición se cumple.
   *
   * @param board El tablero de juego representado como una matriz de cadenas.
   * @param player El jugador para quien se evalúa la puntuación (Player.X o Player.O).
   * @returns La puntuación basada en el estado actual del tablero:
   *          - 10 si el jugador gana.
   *          - -10 si el jugador pierde.
   *          - 0 si el juego es un empate.
   *          - 1000 si el juego aún no está decidido.
   */
  public evaluate(board: string[][], player: Player): number {
    let score = 0;
    const emptyCellCount = this.countEmptyCell(board);
    const isAWinner = this.checkBoardForWinner(board);

    if (isAWinner) {
      const isCurrentPlayerWinner =
        (player === Player.X && this._gameStatus() === GameStatus.X_WON) ||
        (player === Player.O && this._gameStatus() === GameStatus.O_WON);

      // Asignar puntuación basado en el estado del ganador
      score = isCurrentPlayerWinner ? 10 : -10;
      return score;
    }

    //Empate
    if (emptyCellCount === 0) {
      this.gameResult = GameStatus.DRAW;
      return 0;
    }

    // Puntuación por defecto si el juego aún está en curso
    return 1000;
  }
  public get gameResult() {
    return this._gameStatus();
  }
  public set gameResult(updated: GameStatus) {
    this._gameStatus.set(updated);
  }
}
