import { TestBed } from '@angular/core/testing';
import { BotLevel } from '@app/data/models/tictactoe/BotLevel.enum';
import { Player } from '@app/data/models/tictactoe/Player.enum';
import { BoardStateService } from './BoardStateService.service';
import { GameStateService } from './GameState.service';
import { SecondPlayerService } from './SecondPlayer.service';
import { TicTacToeControllerService } from './TicTacToeController.service';
import { UserPlayerService } from './UserPlayer.service';

describe('Service: TicTacToeController', () => {
  let controller: TicTacToeControllerService;
  /** How many times the controller asked the bot to move. */
  let botCalls: number;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TicTacToeControllerService,
        BoardStateService,
        GameStateService,
        SecondPlayerService,
        UserPlayerService,
      ],
    });
    controller = TestBed.inject(TicTacToeControllerService);
    botCalls = 0;
    controller._notifyBot.subscribe(() => botCalls++);
  });

  /** The page answers each notice with playBot, half a second later. */
  function againstBot(level: BotLevel, userPlaysO = false): void {
    controller.changeBotState();
    controller.updateBotLevel(level);
    if (userPlaysO) {
      controller.updateMainPlayer(Player.O);
      controller.updateSecondPlayer(Player.X);
    }
    controller.initGame();
  }

  const marks = () => controller.retrieveBoard().flat().filter((cell) => cell !== '0');

  it('should be created', () => {
    expect(controller).toBeTruthy();
  });

  it('the bot answers the player in the cell its level picks', () => {
    againstBot(BotLevel.MASTER);
    controller.runGame(0, 0);
    expect(botCalls).toBe(1);

    controller.playBot();

    // Against a corner opening only the center holds.
    expect(controller.retrieveBoard()[1][1]).toBe('O');
    expect(controller.isTheMainPlayerTurn()).toBe(true);
  });

  it('the bot opens when the player took O', () => {
    againstBot(BotLevel.MASTER, true);
    expect(botCalls).toBe(1);

    controller.playBot();

    expect(marks()).toEqual(['X']);
    expect(controller.isTheMainPlayerTurn()).toBe(true);
  });

  it('the bot does not move out of turn', () => {
    againstBot(BotLevel.MASTER);
    controller.playBot();
    expect(marks()).toEqual([]);
  });

  it('a notice that arrives after a restart is dropped', () => {
    againstBot(BotLevel.MASTER);
    controller.runGame(0, 0);
    controller.reset();

    controller.playBot();

    expect(marks()).toEqual([]);
  });

  it('Master is never beaten over full games', () => {
    for (let game = 0; game < 30; game++) {
      controller.reset();
      againstBot(BotLevel.MASTER, game % 2 === 0);
      while (controller.partyIsRunning()) {
        if (controller.isTheMainPlayerTurn()) {
          const board = controller.retrieveBoard();
          const free = board.flat().map((cell, i) => (cell === '0' ? i : -1)).filter((i) => i >= 0);
          const cell = free[Math.floor(Math.random() * free.length)];
          controller.runGame(Math.floor(cell / 3), cell % 3);
        } else {
          controller.playBot();
        }
      }
      const userWon = game % 2 === 0 ? controller.isOPlayerWinner() : controller.isXPlayerWinner();
      expect(userWon).toBe(false);
    }
  });
});
