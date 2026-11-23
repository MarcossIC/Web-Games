import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ChessBotLevel, PlayedMove } from '@app/data/models/chess/chess-mode';
import { ChessGameOverType } from '@app/data/models/chess/chess-gameOverType';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { ChessBot } from '@app/data/services/chess/ChessBot.service';
import { ChessController } from '@app/data/services/chess/ChessController.service';
import { chessTestProviders, squareAt } from '@app/data/services/chess/chess-testing';

import { ChessComponent } from './chess.component';

/** A machine that answers when the spec says, with what the spec says. */
class ScriptedBot {
  public readonly asked: { moves: PlayedMove[]; level: ChessBotLevel }[] = [];
  private readonly answers: ((move: PlayedMove | null) => void)[] = [];
  /** How many times it was told to get ready, and to drop what it was thinking. */
  public prepared = 0;
  public cancelled = 0;

  public prepare(): void {
    this.prepared++;
  }

  public cancel(): void {
    this.cancelled++;
  }

  public think(moves: readonly PlayedMove[], level: ChessBotLevel): Promise<PlayedMove | null> {
    this.asked.push({ moves: [...moves], level });
    return new Promise((resolve) => this.answers.push(resolve));
  }

  /** Answers the question number `index` (the last one unless told). */
  public answer(move: string | null, index = this.answers.length - 1): void {
    this.answers[index](move ? moveOf(move) : null);
  }
}

const moveOf = (name: string): PlayedMove => {
  const [prevX, prevY] = squareAt(name.slice(0, 2));
  const [newX, newY] = squareAt(name.slice(2, 4));
  return { prevX, prevY, newX, newY, promotedPieceType: PieceSymbol.UNKNOWN };
};

describe('ChessComponent', () => {
  let fixture: ComponentFixture<ChessComponent>;
  let root: HTMLElement;
  let controller: ChessController;
  let bot: ScriptedBot;

  /** Lets the page react, then the promises it waits on, then lets it react again. */
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const tap = (name: string) => {
    const [x, y] = squareAt(name);
    root.querySelector<HTMLElement>(`#square-${x}-${y}`)!.click();
    fixture.detectChanges();
  };
  /** Moves a piece the way a player does: a tap on it, a tap on where it goes. */
  const play = async (move: string) => {
    tap(move.slice(0, 2));
    tap(move.slice(2, 4));
    await settle();
  };
  const answer = async (move: string | null, index?: number) => {
    bot.answer(move, index);
    await settle();
  };
  const moves = () => controller.gameHistory.moveList.flat();
  const squareIds = () =>
    Array.from(root.querySelectorAll('.chess-square')).map((square) => square.id);
  const cardNames = () =>
    Array.from(root.querySelectorAll('.player-name')).map((name) => name.textContent!.trim());
  const pieceAt = (name: string) => {
    const [x, y] = squareAt(name);
    return root.querySelector(`#square-${x}-${y} .piece`)!.children.length > 0;
  };

  beforeEach(async () => {
    bot = new ScriptedBot();
    TestBed.configureTestingModule({
      imports: [ChessComponent],
      providers: [provideRouter([]), ...chessTestProviders()],
    });
    // The page provides its own machine: the spec's takes its place.
    TestBed.overrideComponent(ChessComponent, {
      set: { providers: [{ provide: ChessBot, useValue: bot }] },
    });
    controller = TestBed.inject(ChessController);
    fixture = TestBed.createComponent(ChessComponent);
    root = fixture.nativeElement;
    await settle();
  });

  const start = async (...args: Parameters<ChessController['start']>) => {
    controller.start(...args);
    await settle();
  };

  it('opens on the menu, over the starting position', () => {
    expect(root.querySelector('welcome-chess-modal')).not.toBeNull();
    expect(root.querySelector('h2')!.textContent).toContain('Chess');
    expect(squareIds().length).toBe(64);
    expect(bot.asked.length).toBe(0);
  });

  it('comes back to the menu on a new visit, whatever was left going', async () => {
    await start('machine', { level: 'hard', side: 'white' });
    await play('e2e4');
    fixture.destroy();

    fixture = TestBed.createComponent(ChessComponent);
    root = fixture.nativeElement;
    await settle();

    expect(controller.started).toBeFalse();
    expect(controller.ply).toBe(0);
    expect(pieceAt('e2')).toBeTrue();
  });

  describe('in practice', () => {
    beforeEach(() => start('practice'));

    it('closes the menu and never asks the machine', async () => {
      expect(root.querySelector('welcome-chess-modal')).toBeNull();

      await play('e2e4');
      await play('e7e5');

      expect(moves()).toEqual(['e4', 'e5']);
      expect(bot.asked.length).toBe(0);
      expect(bot.prepared).toBe(0);
    });

    it('shows the board from white\'s side and names the sides', () => {
      expect(squareIds()[0]).toBe('square-0-0');
      expect(squareIds()[63]).toBe('square-7-7');
      expect(cardNames()).toEqual(['Black Player', 'White Player']);
    });
  });

  describe('against the machine, with white', () => {
    beforeEach(() => start('machine', { level: 'hard', side: 'white' }));

    it('waits for the player to open', () => {
      expect(bot.asked.length).toBe(0);
      expect(cardNames()).toEqual(['Machine · Hard', 'You']);
    });

    it('asks the machine for its answer to the game so far, at the level picked', async () => {
      await play('e2e4');

      expect(bot.asked.length).toBe(1);
      expect(bot.asked[0].level).toBe('hard');
      expect(bot.asked[0].moves).toEqual([moveOf('e2e4')]);
    });

    it('plays the answer and gives the turn back', async () => {
      await play('e2e4');

      await answer('e7e5');

      expect(moves()).toEqual(['e4', 'e5']);
      expect(controller.playerTurn).toBe(ChessPlayers.WHITE);
      expect(pieceAt('e5')).toBeTrue();
      expect(pieceAt('e7')).toBeFalse();
      expect(controller.gameHistory.gameHistoryPointer).toBe(2);
    });

    it('says the machine is thinking while it owes a move', async () => {
      const tags = () =>
        Array.from(root.querySelectorAll('.player-card.is-active .turn-tag')).map(
          (tag) => tag.textContent!.trim()
        );
      expect(tags()).toEqual(['Turn']);

      await play('e2e4');

      expect(tags()).toEqual(['Thinking']);
    });

    it('does not let the player move the machine\'s pieces, nor move twice', async () => {
      await play('e2e4');

      await play('e7e5');
      await play('d2d4');

      expect(moves()).toEqual(['e4']);
      const [x, y] = squareAt('d2');
      expect(root.querySelector(`#square-${x}-${y}`)!.getAttribute('draggable')).toBe('false');
    });

    it('drops an answer that comes after the move was taken back', async () => {
      await play('e2e4');

      controller.undoLastMove();
      await settle();
      await answer('e7e5');

      expect(moves()).toEqual([]);
      expect(controller.playerTurn).toBe(ChessPlayers.WHITE);
    });

    it('answers the new move, not the one taken back', async () => {
      await play('e2e4');
      controller.undoLastMove();
      await settle();

      await play('d2d4');
      // The answer to e4 arrives late: it is not a reply to d4.
      await answer('e7e5', 0);
      expect(moves()).toEqual(['d4']);

      await answer('d7d5');
      expect(moves()).toEqual(['d4', 'd5']);
      expect(bot.asked[1].moves).toEqual([moveOf('d2d4')]);
    });

    it('takes back the answer along with the move on undo', async () => {
      await play('e2e4');
      await answer('e7e5');
      await play('g1f3');
      await answer('b8c6');

      root.querySelector<HTMLElement>('chess-button.undo')!.click();
      await settle();

      expect(moves()).toEqual(['e4', 'e5']);
      expect(pieceAt('g1')).toBeTrue();
      expect(pieceAt('b8')).toBeTrue();
      expect(bot.asked.length).toBe(2);
    });

    it('stops waiting on the machine during a pause, and asks again after', async () => {
      await play('e2e4');

      controller.isPaused = true;
      await settle();
      await answer('e7e5');
      expect(moves()).toEqual(['e4']);

      controller.isPaused = false;
      await settle();
      expect(bot.asked.length).toBe(2);
      await answer('c7c5');
      expect(moves()).toEqual(['e4', 'c5']);
    });

    it('gets the machine ready as the game starts, before it owes a move', () => {
      expect(bot.prepared).toBe(1);
      expect(bot.asked.length).toBe(0);
    });

    it('tells the machine to drop what it was thinking when the game is paused', async () => {
      await play('e2e4');
      const before = bot.cancelled;

      controller.isPaused = true;
      await settle();

      expect(bot.cancelled).toBeGreaterThan(before);
    });

    it('plays a move of its own if the machine gives none or one that is not allowed', async () => {
      await play('e2e4');
      await answer('e7e4');
      expect(controller.ply).toBe(2);
      expect(controller.playerTurn).toBe(ChessPlayers.WHITE);

      await play('d2d4');
      await answer(null);
      expect(controller.ply).toBe(4);
    });

    it('brings the board back from a past position to play the answer', async () => {
      await play('e2e4');
      await answer('e7e5');
      await play('g1f3');

      // The player looks at the start of the game while the machine thinks.
      fixture.componentInstance.showPreviousPosition(0);
      await settle();
      expect(pieceAt('e2')).toBeTrue();

      await answer('b8c6');

      expect(controller.gameHistory.gameHistoryPointer).toBe(4);
      expect(pieceAt('c6')).toBeTrue();
      expect(pieceAt('e2')).toBeFalse();
    });

    it('asks nothing more once the game is over', async () => {
      await play('f2f3');
      await answer('e7e5');
      await play('g2g4');
      await answer('d8h4');

      expect(controller.gameOverType).toBe(ChessGameOverType.CHECK_MATE_BLACK);
      expect(bot.asked.length).toBe(2);
      expect(root.querySelector('endgame-modal-chess .verdict')!.textContent).toContain(
        'The machine wins!'
      );
    });

    it('tells the player they won', async () => {
      await play('e2e4');
      await answer('f7f6');
      await play('d2d4');
      await answer('g7g5');
      await play('d1h5');

      expect(controller.gameOverType).toBe(ChessGameOverType.CHECK_MATE_WHITE);
      expect(root.querySelector('endgame-modal-chess .verdict')!.textContent).toContain('You win!');
      expect(bot.asked.length).toBe(2);
    });
  });

  it('drops an answer that comes after the page was left', async () => {
    await start('machine', { level: 'hard', side: 'white' });
    await play('e2e4');

    fixture.destroy();
    bot.answer('e7e5');
    await Promise.resolve();

    expect(controller.ply).toBe(1);
  });

  describe('against the machine, with black', () => {
    beforeEach(() => start('machine', { level: 'rookie', side: 'black' }));

    it('asks the machine to open', () => {
      expect(bot.asked.length).toBe(1);
      expect(bot.asked[0].moves).toEqual([]);
      expect(bot.asked[0].level).toBe('rookie');
    });

    it('shows the board from black\'s side, the player at the bottom', () => {
      expect(squareIds()[0]).toBe('square-7-7');
      expect(squareIds()[63]).toBe('square-0-0');
      expect(cardNames()).toEqual(['Machine · Rookie', 'You']);
    });

    it('puts the coordinates on the left and bottom edges of the turned board', () => {
      const coords = (selector: string) =>
        Array.from(root.querySelectorAll(selector)).map((coord) => coord.textContent!.trim());

      expect(coords('.coord-rank')).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
      expect(coords('.coord-file')).toEqual(['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']);
      // h1 is the top left corner now: that is where the rank numbers are.
      const [x, y] = squareAt('h1');
      expect(root.querySelector(`#square-${x}-${y} .coord-rank`)).not.toBeNull();
    });

    it('plays the opening move, then it is the player\'s turn', async () => {
      await answer('e2e4');
      await play('e7e5');

      expect(moves()).toEqual(['e4', 'e5']);
      expect(bot.asked.length).toBe(2);
      expect(bot.asked[1].moves).toEqual([moveOf('e2e4'), moveOf('e7e5')]);
    });

    it('asks the machine to open again on a new game', async () => {
      await answer('e2e4');
      await play('e7e5');

      fixture.componentInstance.restartGame();
      await settle();

      expect(bot.asked.length).toBe(3);
      expect(bot.asked[2].moves).toEqual([]);
      expect(pieceAt('e2')).toBeTrue();
    });
  });

  it('shows the new game\'s board when one is started from the menu', async () => {
    await start('practice');
    await play('e2e4');

    controller.backToMenu();
    await settle();
    await start('machine', { level: 'normal', side: 'white' });

    expect(pieceAt('e2')).toBeTrue();
    expect(pieceAt('e4')).toBeFalse();
  });
});
