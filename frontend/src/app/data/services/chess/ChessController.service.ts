import { Injectable, inject } from '@angular/core';
import { ChessBoard } from '@app/data/services/chess/ChessBoard.service';
import { Piece } from '@app/data/models/chess/Piece';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { ChessHistory } from '@app/data/services/chess/ChessHistory.service';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { Coords } from '@app/data/models/chess/chess-coords';
import PawnPiece from '@app/data/services/chess/PawnPiece';
import KingPiece from '@app/data/services/chess/KingPiece';
import RookPiece from '@app/data/services/chess/RookPiece';
import { LastMove, MoveType } from '@app/data/models/chess/chess-lastmove';
import KnightPiece from '@app/data/services/chess/KnightPiece';
import BishopPiece from '@app/data/services/chess/BishopPiece';
import QueenPiece from '@app/data/services/chess/QueenPiece';
import { BOARD_ROW_SIZE } from 'assets/constants/chess';
import { ChessBoardMapper } from '@app/data/services/chess/ChessBoardMapper.service';
import { ChessGameOverType } from '@app/data/models/chess/chess-gameOverType';

interface ChessGameState {
  lastMove: LastMove | undefined;
  isInCheck: boolean;
  currentPlayer: ChessPlayers;
}

@Injectable()
export class ChessControllerService {
  private chessBoard = inject(ChessBoard);
  private chessHistory = inject(ChessHistory);
  private mapper = inject(ChessBoardMapper);
  private _isGameOver: boolean;
  private _playerTurn: ChessPlayers;
  private fiftyMoveRuleCounter: number;
  private fullNumberOfMoves: number;
  private threeFoldRepetitionDictionary: Map<string, number>;
  private threeFoldRepetitionFlag: boolean;
  private _boardAsSymbols: string;
  private _gameOverType: ChessGameOverType;

  constructor() {
    this.fullNumberOfMoves = 1;
    this._isGameOver = false;
    this._playerTurn = ChessPlayers.WHITE;
    this.fiftyMoveRuleCounter = 0;
    this.threeFoldRepetitionFlag = false;
    this.threeFoldRepetitionDictionary = new Map<string, number>();
    this.chessBoard.updateSafeCoords({
      isInCheck: this.chessHistory.checkState.isInCheck,
      lastMove: this.chessHistory.lastMove,
      currentPlayer: this._playerTurn,
    });
    this.chessHistory.updateHistory(this.currentChessBoardView);
    this._boardAsSymbols = ChessBoardMapper.DEFAULT_INITIAL_POSITION;
    this._gameOverType = ChessGameOverType.IN_GAME;
  }

  public restartGame() {
    this._gameOverType = ChessGameOverType.IN_GAME;
    this._isGameOver = false;
    this._playerTurn = ChessPlayers.WHITE;
    this.fiftyMoveRuleCounter = 0;
    this.threeFoldRepetitionFlag = false;
    this.threeFoldRepetitionDictionary = new Map<string, number>();
    this.chessHistory.resetAllHistory();
    this.chessBoard.restart();
    this.chessBoard.updateSafeCoords({
      isInCheck: this.chessHistory.checkState.isInCheck,
      lastMove: this.chessHistory.lastMove,
      currentPlayer: this._playerTurn,
    });
    this._boardAsSymbols = ChessBoardMapper.DEFAULT_INITIAL_POSITION;
  }

  public movePiece(
    prevX: number,
    prevY: number,
    newX: number,
    newY: number,
    promotedPieceType: PieceSymbol | null
  ) {
    if (this._isGameOver) throw new Error('Game is over, you cant play move');

    if (
      !this.chessBoard.moveValidator.areCoordsValid(prevX, prevY) ||
      !this.chessBoard.moveValidator.areCoordsValid(newX, newY)
    ) {
      return;
    }

    const piece: Piece = this.chessBoard.board[prevX][prevY];

    if (piece.isEmpty() || piece.player !== this._playerTurn) return;

    const safeCoords: Coords[] | undefined = this.chessBoard.safeCoords.get(
      prevX + ',' + prevY
    );

    if (
      !safeCoords ||
      !safeCoords.find((coords) => coords.x === newX && coords.y === newY)
    ) {
      throw new Error('Square is not safe');
    }

    const moveType = new Set<MoveType>();

    const takenPiece = this.chessBoard.board[newX][newY];

    const isPieceTaken: boolean = !!takenPiece && !takenPiece.isEmpty();
    if (isPieceTaken) {
      moveType.add(MoveType.Capture);
    }

    this.fiftyMoveRuleCounter =
      piece instanceof PawnPiece || isPieceTaken
        ? 0
        : this.fiftyMoveRuleCounter + 0.5;

    this.handlingSpecialMoves(piece, prevX, prevY, newX, newY, moveType);
    if (
      (piece instanceof PawnPiece ||
        piece instanceof KingPiece ||
        piece instanceof RookPiece) &&
      !piece.hasMoved
    ) {
      piece.updateMoved();
    }
    // update the board
    if (promotedPieceType && promotedPieceType !== PieceSymbol.UNKNOWN) {
      this.chessBoard.board[newX][newY] = this.promotedPiece(promotedPieceType);
      moveType.add(MoveType.Promotion);
    } else {
      this.chessBoard.board[newX][newY] = piece;
    }

    this.chessBoard.board[prevX][prevY] = Piece.createEmpty();
    this.chessHistory.setLastMove({
      prevX,
      prevY,
      currX: newX,
      currY: newY,
      piece,
      moveType,
    });
    this.swapPlyer();

    const checkState = this.chessBoard.moveValidator.isInCheck(
      this.chessBoard.board,
      this._playerTurn
    );
    this.chessHistory.setCheckState(checkState);

    const updatedSafeCoords = this.chessBoard.findSafeCoords({
      isInCheck: this.chessHistory.checkState.isInCheck,
      lastMove: this.chessHistory.lastMove,
      currentPlayer: this._playerTurn,
    });

    if (checkState.isInCheck) {
      moveType.add(
        !updatedSafeCoords.size ? MoveType.CheckMate : MoveType.Check
      );
    } else if (!moveType.size) {
      moveType.add(MoveType.BasicMove);
    }

    this.chessHistory.storeMove(
      promotedPieceType || PieceSymbol.UNKNOWN,
      this.chessBoard.board,
      this.chessBoard.safeCoords
    );
    this.chessHistory.updateHistory(this.currentChessBoardView);
    //this.updateGameHistory();

    this.chessBoard.setSafeCoords(updatedSafeCoords);

    if (this._playerTurn === ChessPlayers.WHITE) {
      this.fullNumberOfMoves++;
    }
    this._boardAsSymbols = this.mapper.convertBoardToSymbol(
      this.chessBoard.board,
      this._playerTurn,
      this.chessHistory.lastMove,
      this.fiftyMoveRuleCounter,
      this.fullNumberOfMoves
    );

    this.updateThreeFoldRepetitionDictionary(this._boardAsSymbols);

    this._isGameOver = this.isGameFinished();
  }

  private handlingSpecialMoves(
    piece: Piece,
    prevX: number,
    prevY: number,
    newX: number,
    newY: number,
    moveType: Set<MoveType>
  ): void {
    const lastMove = this.chessHistory.lastMove;

    if (piece instanceof KingPiece && Math.abs(newY - prevY) === 2) {
      // newY > prevY  === king side castle

      const rookPositionX = prevX;
      const rookPositionY = newY > prevY ? 7 : 0;

      const rook = this.chessBoard.board[rookPositionX][
        rookPositionY
      ] as RookPiece;

      const rookNewPositionY = newY > prevY ? 5 : 3;

      this.chessBoard.board[rookPositionX][rookPositionY] = Piece.createEmpty();

      this.chessBoard.board[rookPositionX][rookNewPositionY] = rook;

      rook.updateMoved();

      moveType.add(MoveType.Castling);
    } else if (
      piece instanceof PawnPiece &&
      lastMove &&
      lastMove.piece instanceof PawnPiece &&
      Math.abs(lastMove.currX - lastMove.prevX) === 2 &&
      prevX === lastMove.currX &&
      newY === lastMove.currY
    ) {
      this.chessBoard.board[lastMove.currX][lastMove.currY] =
        Piece.createEmpty();
      moveType.add(MoveType.Capture);
    }
  }

  public promotedPiece(
    symbol: PieceSymbol
  ): KnightPiece | BishopPiece | RookPiece | QueenPiece {
    const pieceOptions = {
      player: this._playerTurn,
      isMovable: true,
    };
    if (
      symbol === PieceSymbol.WHITE_KNIGHT ||
      symbol === PieceSymbol.BLACK_KNIGHT
    )
      return KnightPiece.createPiece(pieceOptions);

    if (
      symbol === PieceSymbol.WHITE_BISHOP ||
      symbol === PieceSymbol.BLACK_BISHOP
    )
      return BishopPiece.createPiece(pieceOptions);

    if (symbol === PieceSymbol.WHITE_ROOK || symbol === PieceSymbol.BLACK_ROOK)
      return RookPiece.createPiece(pieceOptions);

    return QueenPiece.createPiece(pieceOptions);
  }

  private isGameFinished(): boolean {
    const checkState = this.chessHistory.checkState;
    const safeCoords = this.chessBoard.safeCoords;
    if (this.insufficientMaterial()) {
      this._gameOverType = ChessGameOverType.DRAW_BY_INSUFFICIENT_MATERIAL;
      return true;
    }

    if (!safeCoords.size) {
      if (checkState.isInCheck) {
        this._gameOverType =
          this._playerTurn === ChessPlayers.WHITE
            ? ChessGameOverType.CHECK_MATE_BLACK
            : ChessGameOverType.CHECK_MATE_WHITE;
      } else {
        this._gameOverType = ChessGameOverType.DRAW_BY_DROWNED;
      }

      return true;
    }

    if (this.threeFoldRepetitionFlag) {
      this._gameOverType = ChessGameOverType.DRAW_BY_REPETITION;
      return true;
    }

    if (this.fiftyMoveRuleCounter === 50) {
      this._gameOverType = ChessGameOverType.DRAW_BY_FIFTYMOVES_RULE;
      return true;
    }

    return false;
  }

  private playerHasOnlyTwoKnightsAndKing(
    pieces: { piece: Piece; x: number; y: number }[]
  ): boolean {
    return (
      pieces.filter((piece) => piece.piece instanceof KnightPiece).length === 2
    );
  }

  private playerHasOnlyBishopsWithSameColorAndKing(
    pieces: { piece: Piece; x: number; y: number }[]
  ): boolean {
    const bishops = pieces.filter(
      (piece) => piece.piece instanceof BishopPiece
    );
    const areAllBishopsOfSameColor =
      new Set(
        bishops.map((bishop) => !ChessBoard.isSquareWhite(bishop.x, bishop.y))
      ).size === 1;
    return bishops.length === pieces.length - 1 && areAllBishopsOfSameColor;
  }

  private insufficientMaterial(): boolean {
    const whitePieces: { piece: Piece; x: number; y: number }[] = [];
    const blackPieces: { piece: Piece; x: number; y: number }[] = [];

    for (let x = 0; x < BOARD_ROW_SIZE; x++) {
      for (let y = 0; y < BOARD_ROW_SIZE; y++) {
        const piece: Piece | null = this.chessBoard.board[x][y];
        if (!piece || piece.isEmpty()) continue;

        if (piece.player === ChessPlayers.WHITE)
          whitePieces.push({ piece, x, y });
        else blackPieces.push({ piece, x, y });
      }
    }

    // King vs King
    if (whitePieces.length === 1 && blackPieces.length === 1) {
      return true;
    }

    // King and Minor Piece vs King
    if (whitePieces.length === 1 && blackPieces.length === 2) {
      return blackPieces.some(
        (piece) =>
          piece.piece instanceof KnightPiece ||
          piece.piece instanceof BishopPiece
      );
    } else if (whitePieces.length === 2 && blackPieces.length === 1) {
      return whitePieces.some(
        (piece) =>
          piece.piece instanceof KnightPiece ||
          piece.piece instanceof BishopPiece
      );
    } // both sides have bishop of same color
    else if (whitePieces.length === 2 && blackPieces.length === 2) {
      const whiteBishop = whitePieces.find(
        (piece) => piece.piece instanceof BishopPiece
      );
      const blackBishop = blackPieces.find(
        (piece) => piece.piece instanceof BishopPiece
      );

      if (whiteBishop && blackBishop) {
        const areBishopsOfSameColor: boolean =
          (ChessBoard.isSquareWhite(whiteBishop.x, whiteBishop.y) &&
            ChessBoard.isSquareWhite(blackBishop.x, blackBishop.y)) ||
          (!ChessBoard.isSquareWhite(whiteBishop.x, whiteBishop.y) &&
            !ChessBoard.isSquareWhite(blackBishop.x, blackBishop.y));

        return areBishopsOfSameColor;
      }
    }

    if (
      (whitePieces.length === 3 &&
        blackPieces.length === 1 &&
        this.playerHasOnlyTwoKnightsAndKing(whitePieces)) ||
      (whitePieces.length === 1 &&
        blackPieces.length === 3 &&
        this.playerHasOnlyTwoKnightsAndKing(blackPieces))
    )
      return true;

    if (
      (whitePieces.length >= 3 &&
        blackPieces.length === 1 &&
        this.playerHasOnlyBishopsWithSameColorAndKing(whitePieces)) ||
      (whitePieces.length === 1 &&
        blackPieces.length >= 3 &&
        this.playerHasOnlyBishopsWithSameColorAndKing(blackPieces))
    )
      return true;

    return false;
  }

  private updateThreeFoldRepetitionDictionary(symbolPiece: string): void {
    const threeFoldRepetitionSymbolKey: string = symbolPiece
      .split(' ')
      .slice(0, 4)
      .join('');
    const threeFoldRepetionValue: number | undefined =
      this.threeFoldRepetitionDictionary.get(threeFoldRepetitionSymbolKey);

    if (threeFoldRepetionValue === undefined) {
      this.threeFoldRepetitionDictionary.set(threeFoldRepetitionSymbolKey, 1);
    } else {
      if (threeFoldRepetionValue === 2) {
        this.threeFoldRepetitionFlag = true;
        return;
      }
      this.threeFoldRepetitionDictionary.set(threeFoldRepetitionSymbolKey, 2);
    }
  }

  public swapPlyer() {
    const whiteIsPlaying = this._playerTurn === ChessPlayers.WHITE;
    this._playerTurn = whiteIsPlaying ? ChessPlayers.BLACK : ChessPlayers.WHITE;
  }

  public get board(): Piece[][] {
    return this.chessBoard.board;
  }

  public get playerGo(): ChessPlayers {
    return this._playerTurn;
  }

  public get gameOverType() {
    return this._gameOverType;
  }
  public get isGameOver() {
    return this._isGameOver;
  }

  public get boardAsSymbols() {
    return this._boardAsSymbols;
  }
  public get currentChessBoardView() {
    return this.chessBoard.chessBoardView();
  }
  public get gameHistory() {
    return this.chessHistory;
  }
  public get safeCoords() {
    return this.chessBoard.safeCoords;
  }
}
