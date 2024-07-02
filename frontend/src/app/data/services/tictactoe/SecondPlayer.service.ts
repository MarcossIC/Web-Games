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
   * Implements the Minimax algorithm with alpha-beta pruning to evaluate the best move in a game.
   * This algorithm is typically used in strategy games to determine the optimal move for the maximizing player.
   *
   * @param board The game board represented as a matrix of strings.
   * @param depth The current depth in the algorithm's search tree.
   * @param isMaximizingPlayer Indicates whether the current player is the maximizer (`true`) or the minimizer (`false`).
   * @param alpha The best current value that the maximizing player can ensure (alpha).
   * @param beta The best current value that the minimizing player can ensure (beta).
   *
   * @returns The evaluated score for the board position considering the optimal strategy.
   */
  protected minimax(
    board: string[][],
    depth: number,
    isMaximizingPlayer: boolean,
    alpha: number,
    beta: number
  ): number {
    const score: number = this.boardStateService.evaluate(board, this.player);

    // Evaluation of the current board position
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
      // Maximizing player (X in the case of Tic Tac Toe)
      let bestScore = -Infinity;

      // Iterate through all empty cells on the board
      for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[0].length; j++) {
          if (board[i][j] === '0') {
            // Make the move for the maximizing player
            board[i][j] = this.player === Player.X ? 'X' : 'O';

            // Recursive call to minimax to evaluate the next move
            bestScore = Math.max(
              bestScore,
              this.minimax(board, depth + 1, false, alpha, beta)
            );

            // Update alpha with the best found value
            alpha = Math.max(alpha, bestScore);

            // Undo the simulated move
            board[i][j] = '0';

            // Perform alpha-beta pruning if possible
            if (beta <= alpha) break;
          }
        }
      }
      return bestScore;
    } else {
      // Minimizing player (O in the case of Tic Tac Toe)
      let bestScore = Infinity;

      // Iterate through all empty cells on the board
      for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[0].length; j++) {
          if (board[i][j] === '0') {
            // Make the move for the minimizing player
            board[i][j] = this.player !== Player.X ? 'X' : 'O';

            // Recursive call to minimax to evaluate the next move
            bestScore = Math.min(
              bestScore,
              this.minimax(board, depth + 1, true, alpha, beta)
            );

            // Update beta with the best found value
            beta = Math.min(beta, bestScore);

            // Undo the simulated move
            board[i][j] = '0';

            // Perform alpha-beta pruning if possible
            if (beta <= alpha) break;
          }
        }
      }
      return bestScore;
    }
  }

  /**
   * Makes a strategic move for the AI player by evaluating potential future states using Minimax algorithm with alpha-beta pruning.
   * Selects the move with the highest Minimax value to maximize chances of winning.
   *
   * @param state The current state of the game screen.
   * @returns The position on the board where the AI will make its move.
   */
  public takeAMasterMove(state: StateScreen): number {
    let avalaible: number[] = state.emptyCells;
    let board: string[][] = state.boardScreen;

    // Evaluate all available actions using Minimax algorithm with alpha-beta pruning
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

    // Sort actions by descending Minimax value
    availableActions.sort((a, b) => b.minMaxValue - a.minMaxValue);

    // Return the position of the highest valued action (best move)
    return availableActions[0].movePosition;
  }

  /**
   * Makes a move for the AI player by evaluating potential future states using Minimax algorithm with alpha-beta pruning.
   * Selects the move with the highest Minimax value to maximize chances of winning, with a chance of random move or second best move.
   *
   * @param state The current state of the game screen.
   * @returns The position on the board where the AI will make its move.
   */
  public takeANoviceMove(state: StateScreen): number {
    let avalaible: number[] = state.emptyCells;

    // Evaluate all available actions using Minimax algorithm with alpha-beta pruning
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

    // Sort actions by descending Minimax value
    availableActions.sort((a, b) => b.minMaxValue - a.minMaxValue);

    // Decide between the best move, a random move, or the second best move
    if (ramdomNumber(false, 100) <= 40 && availableActions.length > 0) {
      return availableActions[0].movePosition; // 40% chance for the best move
    } else if (availableActions.length >= 2) {
      return availableActions[1].movePosition; // Second best move if available
    }
    return availableActions[0].movePosition;
  }

  /**
   * Makes a random move for the AI player without considering game strategy.
   * Useful for novice or random AI behavior.
   *
   * @param state The current state of the game screen.
   * @returns A randomly selected position on the board where the AI will make its move.
   */
  public takeABlindMove(state: StateScreen): number {
    // Select a random empty cell from the list of available cells
    let randomCell =
      state.emptyCells[ramdomNumber(true, state.emptyCells.length - 1)];

    // Create an AI action object for the selected cell
    const action = this.AIAction(randomCell);

    // Return the position of the randomly selected move
    return action.movePosition;
  }

  /**
   * Applies the AI's action to the current game state, updating the board and game turn information accordingly.
   *
   * @param state The current state of the game screen.
   * @param action The AI action to be applied, containing the move position to be played.
   * @returns The updated state of the game screen after applying the AI's action.
   */
  private applyTo(state: StateScreen, action: ActionsAI): StateScreen {
    // Calculate the board coordinates from the linear move position
    const { x, y } = calcArrayPositionToMatrixCords(action.movePosition, 3, 3);

    // Place the AI's move (X or O) on the game board
    state.boardScreen[y][x] = state.turn === Player.X ? 'X' : 'O';
    // Switch turns between players (X and O)
    state.turn = state.turn === Player.X ? Player.O : Player.X;
    // Update the move position in the game state
    state.movePosition = action.movePosition;
    // Update the list of empty cells on the game board
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
