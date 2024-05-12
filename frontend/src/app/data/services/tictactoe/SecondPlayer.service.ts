import { Injectable, inject } from '@angular/core';
import { BotLevel } from '@app/data/models/tictactoe/BotLevel.enum';
import { BotPriority } from '@app/data/models/tictactoe/BotPriority.enum';
import { Player } from '@app/data/models/tictactoe/Player.enum';
import { StateScreen } from '@app/data/models/tictactoe/stateScreen';
import {
  arrayToMatrix,
  calcArrayPositionToMatrixCords,
  findEmptyBoardCells,
  findEmptyBoardCellsForArray,
  ramdomNumber,
} from '../util.service';
import { ActionsAI } from '@app/data/models/tictactoe/ActionsAI';
import { GameStateService } from './GameState.service';
import { BoardStateService } from './BoardStateService.service';
import { FIRST_PRIOTIY, SECOND_PRIOTIY, TIE } from 'assets/constants/tictactoe';

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

  protected minimax(
    board: string[][],
    depth: number,
    isMaximizingPlayer: boolean,
    alpha: number,
    beta: number
  ): number {
    const score: number = this.boardStateService.evaluate(board, this.player);

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
      let bestScore = -Infinity;

      for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[0].length; j++) {
          if (board[i][j] === '0') {
            board[i][j] = this.player === Player.X ? 'X' : 'O';
            bestScore = Math.max(
              bestScore,
              this.minimax(board, depth + 1, false, alpha, beta)
            );
            alpha = Math.max(alpha, bestScore);
            board[i][j] = '0';

            if (beta <= alpha) break;
          }
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;

      for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[0].length; j++) {
          if (board[i][j] === '0') {
            board[i][j] = this.player !== Player.X ? 'X' : 'O';
            bestScore = Math.min(
              bestScore,
              this.minimax(board, depth + 1, true, alpha, beta)
            );
            beta = Math.min(beta, bestScore);
            board[i][j] = '0';
            if (beta <= alpha) break;
          }
        }
      }
      return bestScore;
    }
  }

  public takeAMasterMove(state: StateScreen): number {
    let avalaible: number[] = state.emptyCells;
    let board: string[][] = state.boardScreen;

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

    availableActions.sort((a, b) => b.minMaxValue - a.minMaxValue);

    return availableActions[0].movePosition;
  }

  public takeANoviceMove(state: StateScreen): number {
    let avalaible: number[] = state.emptyCells;

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

    availableActions.sort((a, b) => b.minMaxValue - a.minMaxValue);

    if (ramdomNumber(false, 100) <= 40 && availableActions.length > 0) {
      return availableActions[0].movePosition;
    } else if (availableActions.length >= 2) {
      return availableActions[1].movePosition;
    }
    return availableActions[0].movePosition;
  }

  public takeABlindMove(state: StateScreen): number {
    let randomCell: number =
      state.emptyCells[ramdomNumber(true, state.emptyCells.length - 1)];
    const action = this.AIAction(randomCell);
    return action.movePosition;
  }

  private AIAction(positionInBoard: number): ActionsAI {
    return { movePosition: positionInBoard, minMaxValue: 0 };
  }

  private applyTo(state: StateScreen, action: ActionsAI): StateScreen {
    const { x, y } = calcArrayPositionToMatrixCords(action.movePosition, 3, 3);
    state.boardScreen[y][x] = state.turn === Player.X ? 'X' : 'O';
    state.turn = state.turn === Player.X ? Player.O : Player.X;
    state.movePosition = action.movePosition;
    state.emptyCells = findEmptyBoardCells(state.boardScreen);
    return state;
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
