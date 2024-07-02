import { Routes, RouterModule } from '@angular/router';
import { ChessBoard } from '@app/data/services/chess/ChessBoard.service';
import { ChessBoardMapper } from '@app/data/services/chess/ChessBoardMapper.service';
import { ChessControllerService } from '@app/data/services/chess/ChessController.service';
import { ChessHistory } from '@app/data/services/chess/ChessHistory.service';
import { ChessMoveValidator } from '@app/data/services/chess/ChessMoveValidator.service';
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
      GameStateService,
      SecondPlayerService,
      UserPlayerService,
      TicTacToeControllerService,
    ],
  },
  {
    path: 'memorama',
    title: 'Game Galaxy - Memorama',
    loadComponent: () => import('@app-pages/memorama/memorama.component'),
    providers: [MemoramaControllerService],
  },
  {
    path: 'chess',
    title: 'Game Galaxy - Chess',
    loadComponent: () => import('@app-pages/chess/chess.component'),
    providers: [
      ChessControllerService,
      ChessBoard,
      ChessBoardMapper,
      ChessHistory,
      ChessMoveValidator,
    ],
  },
  {
    path: '**',
    title: 'GG - Not found',
    loadComponent: () => import('@app-pages/notfound/notfound.component'),
    providers: [ChessControllerService],
  },
];

export default routes;
