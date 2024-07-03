import { Injectable, inject } from '@angular/core';
import { BotLevel } from '@app/data/models/tictactoe/BotLevel.enum';
import { Player } from '@app/data/models/tictactoe/Player.enum';
import { StateScreen } from '@app/data/models/tictactoe/stateScreen';
import {
  calcArrayPositionToMatrixCords,
  findEmptyBoardCells,
  ramdomNumber,
} from '../util.service';
import { ActionsAI } from '@app/data/models/tictactoe/ActionsAI';
import { BoardStateService } from './BoardStateService.service';

@Injectable({
  providedIn: 'root',
})
export class SecondPlayerService {
  private player: Player;
  private _isBotPlaying: boolean;
  private countWins: number;
  private botLevel: BotLevel;
  private boardStateService: BoardStateService = inject(BoardStateService);

  constructor() {
    this.player = Player.O;
    this._isBotPlaying = false;
    this.countWins = 0;
    this.botLevel = BotLevel.ROCKIE;
  }

  public win(): void {
    this.countWins++;
  }

  public getCountWins(): number {
    return this.countWins;
  }

  public reset(): void {
    this.player = Player.O;
    this._isBotPlaying = false;
    this.countWins = 0;
    this.botLevel = BotLevel.ROCKIE;
  }

  /**
   * Implementa el algoritmo Minimax con poda alfa-beta para evaluar el mejor movimiento en un juego.
   * Este algoritmo se utiliza típicamente en juegos de estrategia para determinar el movimiento óptimo para el jugador maximizador.
   *
   * @param board El tablero de juego representado como una matriz de cadenas.
   * @param depth La profundidad actual en el árbol de búsqueda del algoritmo.
   * @param isMaximizingPlayer Indica si el jugador actual es el maximizador (`true`) o el minimizador (`false`).
   * @param alpha El mejor valor actual que el jugador maximizador puede asegurar (alfa).
   * @param beta El mejor valor actual que el jugador minimizador puede asegurar (beta).
   *
   * @returns La puntuación evaluada para la posición del tablero considerando la estrategia óptima.
   */
  protected minimax(
    board: string[][],
    depth: number,
    isMaximizingPlayer: boolean,
    alpha: number,
    beta: number
  ): number {
    const score: number = this.boardStateService.evaluate(board, this.player);

    // Evaluación de la posición actual del tablero
    if (score === 10) {
      return score - depth;
    }
    if (score === -10) {
      return score + depth;
    }
    if (score === 0) {
      return 0;
    }

    if (isMaximizingPlayer) {
      // Jugador maximizador (X en el caso del Tres en Raya)
      let bestScore = -Infinity;

      // Iterar a través de todas las celdas vacías en el tablero
      for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[0].length; j++) {
          if (board[i][j] === '0') {
            // Realizar el movimiento para el jugador maximizador
            board[i][j] = this.player === Player.X ? 'X' : 'O';

            // Llamada recursiva a minimax para evaluar el siguiente movimiento
            bestScore = Math.max(
              bestScore,
              this.minimax(board, depth + 1, false, alpha, beta)
            );

            // Actualizar alfa con el mejor valor encontrado
            alpha = Math.max(alpha, bestScore);

            // Deshacer el movimiento simulado
            board[i][j] = '0';

            // Realizar poda alfa-beta si es posible
            if (beta <= alpha) break;
          }
        }
      }
      return bestScore;
    } else {
      // Jugador minimizador (O en el caso del Tres en Raya)
      let bestScore = Infinity;
      const CURRENT_BOARD_LEN = board.length;
      const FIRSTH_ONE_BOARD_LEN = board[0].length;

      // Iterar a través de todas las celdas vacías en el tablero
      for (let i = 0; i < CURRENT_BOARD_LEN; i++) {
        for (let j = 0; j < FIRSTH_ONE_BOARD_LEN; j++) {
          if (board[i][j] === '0') {
            // Realizar el movimiento para el jugador minimizador
            board[i][j] = this.player !== Player.X ? 'X' : 'O';

            // Llamada recursiva a minimax para evaluar el siguiente movimiento
            bestScore = Math.min(
              bestScore,
              this.minimax(board, depth + 1, true, alpha, beta)
            );

            // Actualizar beta con el mejor valor encontrado
            beta = Math.min(beta, bestScore);

            // Deshacer el movimiento simulado
            board[i][j] = '0';

            // Realizar poda alfa-beta si es posible
            if (beta <= alpha) break;
          }
        }
      }
      return bestScore;
    }
  }

  /**
   * Realiza un movimiento estratégico para el jugador IA evaluando los posibles estados futuros utilizando el algoritmo Minimax con poda alfa-beta.
   * Selecciona el movimiento con el valor Minimax más alto para maximizar las posibilidades de ganar.
   *
   * @param state El estado actual de la pantalla del juego.
   * @returns La posición en el tablero donde la IA realizará su movimiento.
   */
  public takeAMasterMove(state: StateScreen): number {
    let avalaible: number[] = state.emptyCells;
    let board: string[][] = state.boardScreen;

    // Evaluar todas las acciones disponibles utilizando el algoritmo Minimax con poda alfa-beta
    let availableActions = avalaible.map((position) => {
      let action = this.AIAction(position);
      var nextState = this.applyTo(state, action);
      action.minMaxValue = this.minimax(
        nextState.boardScreen,
        0,
        nextState.turn === this.player ? true : false,
        -Infinity,
        Infinity
      );
      return action;
    });

    // Ordenar las acciones por valor Minimax descendente
    availableActions.sort((a, b) => b.minMaxValue - a.minMaxValue);

    // Devolver la posición de la acción con el valor más alto (mejor movimiento)
    return availableActions[0].movePosition;
  }

  /**
   * Realiza un movimiento para el jugador IA evaluando los posibles estados futuros utilizando el algoritmo Minimax con poda alfa-beta.
   * Selecciona el movimiento con el valor Minimax más alto para maximizar las posibilidades de ganar, con una probabilidad de movimiento aleatorio o segundo mejor movimiento.
   *
   * @param state El estado actual de la pantalla del juego.
   * @returns La posición en el tablero donde la IA realizará su movimiento.
   */
  public takeANoviceMove(state: StateScreen): number {
    let avalaible: number[] = state.emptyCells;

    // Evaluar todas las acciones disponibles utilizando el algoritmo Minimax con poda alfa-beta
    let availableActions = avalaible.map((position) => {
      let action = this.AIAction(position);
      var nextState = this.applyTo(state, action);
      action.minMaxValue = this.minimax(
        nextState.boardScreen,
        0,
        true,
        -Infinity,
        Infinity
      );
      return action;
    });

    // Ordenar las acciones por valor Minimax descendente
    availableActions.sort((a, b) => b.minMaxValue - a.minMaxValue);

    // Decidir entre el mejor movimiento, un movimiento aleatorio o el segundo mejor movimiento
    if (ramdomNumber(false, 100) <= 40 && availableActions.length > 0) {
      return availableActions[0].movePosition; // 40% de probabilidad para el mejor movimiento
    } else if (availableActions.length >= 2) {
      return availableActions[1].movePosition; // Segundo mejor movimiento si está disponible
    }
    return availableActions[0].movePosition;
  }

  /**
   * Realiza un movimiento aleatorio para el jugador IA sin considerar la estrategia del juego.
   * Útil para comportamiento de IA novato o aleatorio.
   *
   * @param state El estado actual de la pantalla del juego.
   * @returns Una posición seleccionada aleatoriamente en el tablero donde la IA realizará su movimiento.
   */
  public takeABlindMove(state: StateScreen): number {
    // Seleccionar una celda vacía aleatoria de la lista de celdas disponibles
    let randomCell =
      state.emptyCells[ramdomNumber(true, state.emptyCells.length - 1)];

    // Crear un objeto de acción de IA para la celda seleccionada
    const action = this.AIAction(randomCell);

    // Devolver la posición del movimiento seleccionado aleatoriamente
    return action.movePosition;
  }

  /**
   * Aplica la acción de la IA al estado actual del juego, actualizando el tablero y la información del turno del juego en consecuencia.
   *
   * @param state El estado actual de la pantalla del juego.
   * @param action La acción de la IA a aplicar, que contiene la posición del movimiento a realizar.
   * @returns El estado actualizado de la pantalla del juego después de aplicar la acción de la IA.
   */
  private applyTo(state: StateScreen, action: ActionsAI): StateScreen {
    // Calcular las coordenadas del tablero a partir de la posición lineal del movimiento
    const { x, y } = calcArrayPositionToMatrixCords(action.movePosition, 3, 3);

    // Colocar el movimiento de la IA (X u O) en el tablero de juego
    state.boardScreen[y][x] = state.turn === Player.X ? 'X' : 'O';
    // Cambiar los turnos entre jugadores (X y O)
    state.turn = state.turn === Player.X ? Player.O : Player.X;
    // Actualizar la posición del movimiento en el estado del juego
    state.movePosition = action.movePosition;
    // Actualizar la lista de celdas vacías en el tablero de juego
    state.emptyCells = findEmptyBoardCells(state.boardScreen);
    return state;
  }

  private AIAction(positionInBoard: number): ActionsAI {
    return { movePosition: positionInBoard, minMaxValue: 0 };
  }

  public changePlayer(updatePlayer: Player): void {
    this.player = updatePlayer;
  }

  public changeBotLevel(updateLevel: BotLevel): void {
    if (this._isBotPlaying) {
      this.botLevel = updateLevel;
    }
  }

  public getPlayer(): Player {
    return this.player;
  }

  public set isBotPlaying(value: boolean) {
    this._isBotPlaying = value;
  }

  public get botAI(): BotLevel {
    return this.botLevel;
  }
  public get isBotPlaying(): boolean {
    return this._isBotPlaying;
  }
}
