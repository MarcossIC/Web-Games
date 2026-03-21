import { Injectable, inject } from '@angular/core';
import { ChessBoard } from '@app/data/services/chess/ChessBoard.service';
import { ChessHistory } from '@app/data/services/chess/ChessHistory.service';
import { ChessPieceMover } from '@app/data/services/chess/ChessPieceMover.service';
import { ChessMoveCounter } from '@app/data/services/chess/ChessMoveCounter.service';
import { ChessBoardConverter } from '@app/data/services/chess/ChessBoardConverter.service';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { SafeCoords } from '@app/data/models/chess/chess-coords';
import { MoveType } from '@app/data/models/chess/chess-lastmove';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { ChessGameOverType } from '@app/data/models/chess/chess-gameOverType';

@Injectable()
export class ChessGameStateManager {
  private chessBoard = inject(ChessBoard);
  private chessHistory = inject(ChessHistory);
  private pieceMover = inject(ChessPieceMover);
  private moveCounter = inject(ChessMoveCounter);
  private converter = inject(ChessBoardConverter);

  /**
   * Calcula las coordenadas seguras del oponente y evalúa si hay jaque.
   * Retorna el MoveType de jaque/mate si corresponde, o null.
   */
  public evaluateCheckState(
    playerTurn: ChessPlayers,
    moveType: Set<MoveType>
  ): SafeCoords {
    const updatedSafeCoords = this.pieceMover.findSafeCoords(
      this.chessBoard.board,
      {
        isInCheck: this.chessHistory.checkState.isInCheck,
        lastMove: this.chessHistory.lastMove,
        currentPlayer: playerTurn,
      }
    );

    const checkState = this.pieceMover.validator.isInCheck(
      this.chessBoard.board,
      playerTurn
    );
    this.chessHistory.setCheckState(checkState);

    if (checkState.isInCheck) {
      moveType.add(!updatedSafeCoords.size ? MoveType.CheckMate : MoveType.Check);
    } else if (!moveType.size) {
      moveType.add(MoveType.BasicMove);
    }

    return updatedSafeCoords;
  }

  /**
   * Actualiza historial, FEN, contadores y verifica si el juego terminó.
   */
  public updateAfterMove(
    updatedSafeCoords: SafeCoords,
    promotedPieceType: PieceSymbol | null,
    playerTurn: ChessPlayers,
    chessBoardView: PieceSymbol[][]
  ): ChessGameOverType | null {
    this.chessHistory.storeMove(
      promotedPieceType || PieceSymbol.UNKNOWN,
      this.chessBoard.board,
      this.pieceMover.safeCoords,
      this.moveCounter.fullNumberOfMoves
    );
    this.chessHistory.updateHistory(chessBoardView);

    this.pieceMover.setSafeCoords(updatedSafeCoords);
    this.moveCounter.updateFullMoveCounter(playerTurn);
    this.updateBoardAsSymbols(playerTurn);

    return this.checkGameFinished(playerTurn);
  }

  /**
   * Verifica si el juego ha terminado y retorna el tipo de finalización, o null si continúa.
   */
  private checkGameFinished(playerTurn: ChessPlayers): ChessGameOverType | null {
    const checkState = this.chessHistory.checkState;
    const safeCoords = this.pieceMover.safeCoords;

    if (this.chessBoard.insufficientMaterial()) {
      return ChessGameOverType.DRAW_BY_INSUFFICIENT_MATERIAL;
    }

    if (!safeCoords.size) {
      if (checkState.isInCheck) {
        return playerTurn === ChessPlayers.WHITE
          ? ChessGameOverType.CHECK_MATE_BLACK
          : ChessGameOverType.CHECK_MATE_WHITE;
      }
      return ChessGameOverType.DRAW_BY_DROWNED;
    }

    if (this.moveCounter.threeFoldRepetitionFlag) {
      return ChessGameOverType.DRAW_BY_REPETITION;
    }

    if (this.moveCounter.isFulfilledFiftyRuleCounter()) {
      return ChessGameOverType.DRAW_BY_FIFTYMOVES_RULE;
    }

    return null;
  }

  private updateBoardAsSymbols(playerTurn: ChessPlayers): void {
    const boardAsSymbols = this.converter.convertBoardToSymbol(
      this.chessBoard.board,
      playerTurn,
      this.chessHistory.lastMove,
      this.moveCounter.fiftyMoveRuleCounter,
      this.moveCounter.fullNumberOfMoves
    );
    this.moveCounter.updateThreeFoldRepetitionDictionary(boardAsSymbols);
  }
}
