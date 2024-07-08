import { Routes } from '@angular/router';
import { ChessBoard } from '@app/data/services/chess/ChessBoard.service';
import { ChessBoardConverter } from '@app/data/services/chess/ChessBoardConverter.service';
import { ChessCaptureCounter } from '@app/data/services/chess/ChessCaptureCounter.service';
import { ChessController } from '@app/data/services/chess/ChessController.service';
import { ChessHistory } from '@app/data/services/chess/ChessHistory.service';
import { ChessMoveCounter } from '@app/data/services/chess/ChessMoveCounter.service';
import { ChessMoveValidator } from '@app/data/services/chess/ChessMoveValidator.service';
import { ChessPieceMover } from '@app/data/services/chess/ChessPieceMover.service';
import { ChronometerServiceService } from '@app/data/services/chronometerService.service';
import { MemoramaControllerService } from '@app/data/services/memorama/memoramaController.service';
import { BoardServiceService } from '@app/data/services/snakeling/BoardService.service';
import { FoodService } from '@app/data/services/snakeling/Food.service';
import { ScoreService } from '@app/data/services/snakeling/Score.service';
import { SnakeService } from '@app/data/services/snakeling/Snake.service';
import { SnakelingControllerService } from '@app/data/services/snakeling/SnakelingController.service';
import { BagOfPiecesService } from '@app/data/services/tetris/BagOfPieces.service';
import { BoardService } from '@app/data/services/tetris/Board.service';
import { NextPieceBoardService } from '@app/data/services/tetris/NextPieceBoard.service';
import { PieceService } from '@app/data/services/tetris/Piece.service';
import { PointsService } from '@app/data/services/tetris/Points.service';
import { TetrisControllerService } from '@app/data/services/tetris/TetrisController.service';
import { BoardStateService } from '@app/data/services/tictactoe/BoardStateService.service';
import { GameStateService } from '@app/data/services/tictactoe/GameState.service';
import { SecondPlayerService } from '@app/data/services/tictactoe/SecondPlayer.service';
import { TicTacToeControllerService } from '@app/data/services/tictactoe/TicTacToeController.service';
import { UserPlayerService } from '@app/data/services/tictactoe/UserPlayer.service';
import { UtilService } from '@app/data/services/util.service';

const routes: Routes = [
  {
    path: '',
    title: 'Game Galaxy',
    loadComponent: () => import('@app-pages/start/start.component'),
  },
  {
    path: 'games',
    title: 'Game Galaxy - Games',
    loadComponent: () => import('@app-pages/games/games.component'),
  },
  {
    path: 'tetris',
    title: 'Game Galaxy - Tetris',
    loadComponent: () => import('@app-pages/tetris/tetris.component'),
    providers: [
      TetrisControllerService,
      BoardService,
      PieceService,
      BagOfPiecesService,
      PointsService,
      NextPieceBoardService,
      UtilService,
      ChronometerServiceService,
    ],
  },
  {
    path: 'snakeling',
    title: 'Game Galaxy - Snakeling',
    loadComponent: () => import('@app-pages/snakeling/snakeling.component'),
    providers: [
      SnakelingControllerService,
      BoardServiceService,
      FoodService,
      SnakeService,
      ScoreService,
    ],
  },
  {
    path: 'tictactoe',
    title: 'Game Galaxy - Tic tac toe',
    loadComponent: () => import('@app-pages/tictactoe/tictactoe.component'),
    providers: [
      TicTacToeControllerService,
      BoardStateService,
      GameStateService,
      SecondPlayerService,
      UserPlayerService,
    ],
  },
  {
    path: 'memorama',
    title: 'Game Galaxy - Memorama',
    loadComponent: () => import('@app-pages/memorama/memorama.component'),
    providers: [MemoramaControllerService, ChronometerServiceService],
  },
  {
    path: 'chess',
    title: 'Game Galaxy - Chess',
    loadComponent: () => import('@app-pages/chess/chess.component'),
    providers: [
      ChessController,
      ChessBoard,
      ChessBoardConverter,
      ChessHistory,
      ChessMoveCounter,
      ChessMoveValidator,
      ChessPieceMover,
      ChessCaptureCounter,
    ],
  },
  {
    path: '**',
    title: 'GG - Not found',
    loadComponent: () => import('@app-pages/notfound/notfound.component'),
  },
];

export default routes;
