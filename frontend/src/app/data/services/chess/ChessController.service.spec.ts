import { TestBed } from '@angular/core/testing';
import { ChessBoard } from '@app/data/services/chess/ChessBoard.service';
import { ChessBoardConverter } from '@app/data/services/chess/ChessBoardConverter.service';
import { ChessCaptureCounter } from '@app/data/services/chess/ChessCaptureCounter.service';
import { ChessController } from '@app/data/services/chess/ChessController.service';
import { ChessGameStateManager } from '@app/data/services/chess/ChessGameStateManager.service';
import { ChessHistory } from '@app/data/services/chess/ChessHistory.service';
import { ChessMoveCounter } from '@app/data/services/chess/ChessMoveCounter.service';
import { ChessMoveHandler } from '@app/data/services/chess/ChessMoveHandler.service';
import { ChessMoveValidator } from '@app/data/services/chess/ChessMoveValidator.service';
import { ChessPieceMover } from '@app/data/services/chess/ChessPieceMover.service';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { ChessGameOverType } from '@app/data/models/chess/chess-gameOverType';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';

/** Board rows run from rank 8 (x = 0) to rank 1 (x = 7). */
const square = (name: string): [number, number] => [
  8 - Number(name[1]),
  name.charCodeAt(0) - 'a'.charCodeAt(0),
];

describe('ChessController undo', () => {
  let controller: ChessController;

  const play = (...moves: string[]) => {
    for (const move of moves) {
      const [fromX, fromY] = square(move.slice(0, 2));
      const [toX, toY] = square(move.slice(2, 4));
      controller.movePiece(fromX, fromY, toX, toY, PieceSymbol.UNKNOWN);
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ChessController,
        ChessMoveHandler,
        ChessGameStateManager,
        ChessBoard,
        ChessBoardConverter,
        ChessHistory,
        ChessMoveCounter,
        ChessMoveValidator,
        ChessPieceMover,
        ChessCaptureCounter,
      ],
    });
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
