import { Provider } from '@angular/core';
import { GAME_STORE, memoryStore } from '@app-persistence';
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

/** Everything the chess route provides, over a store that forgets: for specs. */
export function chessTestProviders(): Provider[] {
  return [
    { provide: GAME_STORE, useValue: memoryStore() },
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
  ];
}

/** A square of the game's board by its name: rows run from rank 8 (x = 0) to rank 1 (x = 7). */
export const squareAt = (name: string): [number, number] => [
  8 - Number(name[1]),
  name.charCodeAt(0) - 'a'.charCodeAt(0),
];
