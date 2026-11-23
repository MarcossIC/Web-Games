import { TestBed } from '@angular/core/testing';
import { GAME_STORE, KeyValueStore } from '@app-persistence';
import { ChessController } from '@app/data/services/chess/ChessController.service';
import { chessSettings } from '@app/data/services/chess/chess-saves';
import { chessTestProviders, squareAt } from '@app/data/services/chess/chess-testing';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { ChessGameOverType } from '@app/data/models/chess/chess-gameOverType';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';

/** Plays moves written as "e2e4" on the controller. */
const playOn = (controller: ChessController, moves: string[]) => {
  for (const move of moves) {
    const [fromX, fromY] = squareAt(move.slice(0, 2));
    const [toX, toY] = squareAt(move.slice(2, 4));
    controller.movePiece(fromX, fromY, toX, toY, PieceSymbol.UNKNOWN);
  }
};

describe('ChessController undo', () => {
  let controller: ChessController;

  const play = (...moves: string[]) => playOn(controller, moves);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: chessTestProviders() });
    controller = TestBed.inject(ChessController);
    controller.restartGame();
  });

  it('has nothing to undo before the first move', () => {
    expect(controller.canUndo).toBeFalse();
    expect(controller.undoLastMove()).toBeFalse();
  });

  it('takes back the last move and gives the turn back', () => {
    const start = controller.currentChessBoardView;
    play('e2e4');

    expect(controller.undoLastMove()).toBeTrue();

    expect(controller.currentChessBoardView).toEqual(start);
    expect(controller.playerTurn).toBe(ChessPlayers.WHITE);
    expect(controller.gameHistory.moveList).toEqual([]);
    expect(controller.canUndo).toBeFalse();
  });

  it('keeps the moves before the one taken back', () => {
    play('e2e4', 'e7e5', 'g1f3');
    controller.undoLastMove();

    expect(controller.gameHistory.moveList).toEqual([['e4', 'e5']]);
    expect(controller.playerTurn).toBe(ChessPlayers.WHITE);
    expect(controller.history.length).toBe(3);
    expect(controller.gameHistory.gameHistoryPointer).toBe(2);
  });

  it('takes back the move that ended the game', () => {
    play('f2f3', 'e7e5', 'g2g4', 'd8h4');
    expect(controller.isGameOver).toBeTrue();

    controller.undoLastMove();

    expect(controller.isGameOver).toBeFalse();
    expect(controller.gameOverType).toBe(ChessGameOverType.IN_GAME);
    expect(controller.playerTurn).toBe(ChessPlayers.BLACK);
    expect(controller.gameHistory.moveList).toEqual([['f3', 'e5'], ['g4']]);
  });
});

describe('ChessController castling', () => {
  let controller: ChessController;

  const play = (...moves: string[]) => playOn(controller, moves);
  /** Whether the king on `from` may go to `to`. */
  const kingMayGo = (from: string, to: string): boolean => {
    const [fromX, fromY] = squareAt(from);
    const [toX, toY] = squareAt(to);
    const targets = controller.safeCoords.get(fromX + ',' + fromY) ?? [];
    return targets.some((coords) => coords.x === toX && coords.y === toY);
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: chessTestProviders() });
    controller = TestBed.inject(ChessController);
    controller.restartGame();
  });

  it('is allowed once the way is clear', () => {
    play('e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'g8f6');

    expect(kingMayGo('e1', 'g1')).toBeTrue();
  });

  it('is still allowed on the move after giving check', () => {
    // The bishop checks on b5 and black blocks: white is not in check,
    // and nothing stops it from castling.
    play('e2e4', 'd7d5', 'g1f3', 'e7e6', 'f1b5', 'c7c6');

    expect(kingMayGo('e1', 'g1')).toBeTrue();
  });

  it('is not a way out of check', () => {
    // Black is ready to castle when the bishop gives check on b5.
    play('e2e4', 'e7e5', 'g1f3', 'g8f6', 'd2d4', 'f8e7', 'd4e5', 'f6e4', 'f1c4', 'd7d6', 'c4b5');
    expect(controller.gameHistory.checkState.isInCheck).toBeTrue();

    expect(kingMayGo('e8', 'g8')).toBeFalse();
    // Out of check by stepping aside, as any king can.
    expect(kingMayGo('e8', 'f8')).toBeTrue();
  });
});

describe('ChessController modes', () => {
  let controller: ChessController;
  let store: KeyValueStore;

  const play = (...moves: string[]) => playOn(controller, moves);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: chessTestProviders() });
    store = TestBed.inject(GAME_STORE);
    controller = TestBed.inject(ChessController);
  });

  it('waits on the menu until a mode is picked', () => {
    expect(controller.started).toBeFalse();
    expect(controller.isPaused).toBeTrue();
    expect(controller.mode).toBe('practice');
  });

  it('starts a practice game, where no move is the machine\'s', () => {
    controller.start('practice');

    expect(controller.started).toBeTrue();
    expect(controller.isPaused).toBeFalse();
    expect(controller.isBotTurn).toBeFalse();
    play('e2e4');
    expect(controller.isBotTurn).toBeFalse();
  });

  it('gives the machine the side the player did not take', () => {
    controller.start('machine', { level: 'hard', side: 'white' });

    expect(controller.mode).toBe('machine');
    expect(controller.botLevel).toBe('hard');
    expect(controller.humanColor).toBe(ChessPlayers.WHITE);
    expect(controller.isBotTurn).toBeFalse();

    play('e2e4');
    expect(controller.isBotTurn).toBeTrue();

    play('e7e5');
    expect(controller.isBotTurn).toBeFalse();
  });

  it('lets the machine open when the player takes black', () => {
    controller.start('machine', { level: 'rookie', side: 'black' });

    expect(controller.humanColor).toBe(ChessPlayers.BLACK);
    expect(controller.isBotTurn).toBeTrue();
  });

  it('draws the side again on each game when asked for a random one', () => {
    const roll = spyOn(Math, 'random');

    roll.and.returnValue(0.1);
    controller.start('machine', { level: 'normal', side: 'random' });
    expect(controller.humanColor).toBe(ChessPlayers.WHITE);

    roll.and.returnValue(0.9);
    controller.restartGame();
    expect(controller.humanColor).toBe(ChessPlayers.BLACK);
  });

  it('keeps the side through an undo', () => {
    const roll = spyOn(Math, 'random').and.returnValue(0.1);
    controller.start('machine', { level: 'normal', side: 'random' });
    play('e2e4', 'e7e5');

    roll.and.returnValue(0.9);
    controller.undoLastMove();

    expect(controller.humanColor).toBe(ChessPlayers.WHITE);
  });

  it('owes no move once the game is over', () => {
    controller.start('machine', { level: 'normal', side: 'black' });
    play('f2f3', 'e7e5', 'g2g4', 'd8h4');

    expect(controller.gameOverType).toBe(ChessGameOverType.CHECK_MATE_BLACK);
    expect(controller.isBotTurn).toBeFalse();
  });

  it('remembers the level and the side for the next visit', () => {
    controller.start('machine', { level: 'master', side: 'black' });

    expect(chessSettings.read(store)).toEqual({ level: 'master', side: 'black' });
    expect(controller.machineSetup()).toEqual({ level: 'master', side: 'black' });
  });

  it('takes a saved level or side it does not know for the usual one', () => {
    chessSettings.write(store, { level: 'grandmaster', side: 'purple' });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [...chessTestProviders(), { provide: GAME_STORE, useValue: store }],
    });

    const fresh = TestBed.inject(ChessController);

    expect(fresh.machineSetup()).toEqual({ level: 'normal', side: 'white' });
  });

  it('goes back to the menu with a clean board', () => {
    controller.start('machine', { level: 'hard', side: 'black' });
    play('e2e4');

    controller.backToMenu();

    expect(controller.started).toBeFalse();
    expect(controller.isPaused).toBeTrue();
    expect(controller.mode).toBe('practice');
    expect(controller.isBotTurn).toBeFalse();
    expect(controller.ply).toBe(0);
  });

  it('counts each game started, and not an undo', () => {
    controller.start('practice');
    const first = controller.gameNumber;
    play('e2e4');
    controller.undoLastMove();
    expect(controller.gameNumber).toBe(first);

    controller.restartGame();
    expect(controller.gameNumber).toBe(first + 1);
  });

  describe('undo against the machine', () => {
    beforeEach(() => controller.start('machine', { level: 'normal', side: 'white' }));

    it('takes back the machine\'s answer with the player\'s move', () => {
      play('e2e4', 'e7e5', 'g1f3', 'b8c6');

      expect(controller.undoLastMove()).toBeTrue();

      expect(controller.gameHistory.moveList).toEqual([['e4', 'e5']]);
      expect(controller.playerTurn).toBe(ChessPlayers.WHITE);
      expect(controller.isBotTurn).toBeFalse();
    });

    it('takes back only the player\'s move while the machine has not answered', () => {
      play('e2e4', 'e7e5', 'g1f3');

      expect(controller.undoLastMove()).toBeTrue();

      expect(controller.gameHistory.moveList).toEqual([['e4', 'e5']]);
      expect(controller.playerTurn).toBe(ChessPlayers.WHITE);
    });

    it('cannot take back the machine\'s opening move', () => {
      controller.start('machine', { level: 'normal', side: 'black' });
      play('e2e4');

      expect(controller.canUndo).toBeFalse();
      expect(controller.undoLastMove()).toBeFalse();
      expect(controller.ply).toBe(1);
    });

    it('gives the turn back to a player with black', () => {
      controller.start('machine', { level: 'normal', side: 'black' });
      play('e2e4', 'e7e5', 'g1f3');

      expect(controller.undoLastMove()).toBeTrue();

      expect(controller.ply).toBe(1);
      expect(controller.playerTurn).toBe(ChessPlayers.BLACK);
    });

    it('takes back the mate the machine gave', () => {
      play('f2f3', 'e7e5', 'g2g4', 'd8h4');
      expect(controller.isGameOver).toBeTrue();

      controller.undoLastMove();

      expect(controller.isGameOver).toBeFalse();
      expect(controller.ply).toBe(2);
      expect(controller.playerTurn).toBe(ChessPlayers.WHITE);
    });
  });
});
