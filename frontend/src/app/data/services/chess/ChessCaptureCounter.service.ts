import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CaptureCounter,
  PieceCaptureCounter,
} from '@app/data/models/chess/chess-capturedpieces';
import { MoveType } from '@app/data/models/chess/chess-lastmove';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { PieceSymbol } from '@app/data/models/chess/piece-symbols';
import { BehaviorSubject, Observable } from 'rxjs';

const DEFAULT_COUNTER: CaptureCounter = {
  pawns: 0,
  bishop: 0,
  queen: 0,
  knight: 0,
  rook: 0,
};

type CaptureKey = keyof CaptureCounter;

@Injectable()
export class ChessCaptureCounter {
  private destroy$ = inject(DestroyRef);
  private subject$: BehaviorSubject<PieceCaptureCounter>;
  private state$: Observable<PieceCaptureCounter>;
  private readonly LIMIT_COUNT: CaptureCounter = {
    pawns: 8,
    queen: 1,
    bishop: 2,
    knight: 2,
    rook: 2,
  };

  constructor() {
    this.subject$ = new BehaviorSubject<PieceCaptureCounter>({
      white: { ...DEFAULT_COUNTER },
      black: { ...DEFAULT_COUNTER },
    });
    this.state$ = this.subject$
      .asObservable()
      .pipe(takeUntilDestroyed(this.destroy$));
  }

  public getDefault() {
    return DEFAULT_COUNTER;
  }

  public resetCaptureCounter() {
    this.subject$.next({
      white: { ...DEFAULT_COUNTER },
      black: { ...DEFAULT_COUNTER },
    });
  }

  public updateCounter(
    moveType: Set<MoveType>,
    player: ChessPlayers,
    promotedPiece: PieceSymbol,
    capturedPiece: PieceSymbol
  ) {
    if (moveType.has(MoveType.Capture)) {
      this.captureCount(player, capturedPiece);
    }
    if (promotedPiece !== PieceSymbol.UNKNOWN) {
      this.promotedPawn(player, promotedPiece);
    }
  }

  private select(player: ChessPlayers, key: CaptureKey): number {
    return player === ChessPlayers.WHITE
      ? this.subject$.getValue().white[key]
      : this.subject$.getValue().black[key];
  }

  private getPieceCaptured(capturedPiece: PieceSymbol): CaptureKey {
    switch (capturedPiece.toLowerCase()) {
      case 'p':
        return 'pawns';
      case 'q':
        return 'queen';
      case 'r':
        return 'rook';
      case 'b':
        return 'bishop';
      case 'n':
        return 'knight';
      default:
        throw new Error('Unknown piece');
    }
  }

  private updateState(
    updatedCounter: CaptureCounter,
    player: ChessPlayers
  ): void {
    const currentState = this.subject$.getValue();
    const newState =
      player === ChessPlayers.WHITE
        ? { ...currentState, white: updatedCounter }
        : { ...currentState, black: updatedCounter };
    this.subject$.next(newState);
  }

  public promotedPawn(player: ChessPlayers, piecePromotedTo: PieceSymbol) {
    if (piecePromotedTo === PieceSymbol.UNKNOWN) return;
    const piece = this.getPieceCaptured(piecePromotedTo);
    const opponentColor = player === ChessPlayers.WHITE ? 'black' : 'white';
    const currentState = this.subject$.getValue();
    const opponentCounter = { ...currentState[opponentColor] };

    if (opponentCounter.pawns < this.LIMIT_COUNT.pawns) {
      opponentCounter.pawns++;
      if (opponentCounter[piece] > 0) {
        --opponentCounter[piece];
      }
      this.updateState(
        opponentCounter,
        player === ChessPlayers.WHITE ? ChessPlayers.BLACK : ChessPlayers.WHITE
      );
    }
  }

  public captureCount(player: ChessPlayers, capturedPiece: PieceSymbol) {
    if (capturedPiece === PieceSymbol.UNKNOWN) return;
    const piece = this.getPieceCaptured(capturedPiece);
    const playerColor = player === ChessPlayers.WHITE ? 'white' : 'black';
    const currentState = this.subject$.getValue();
    const playerCounter = { ...currentState[playerColor] };

    if (playerCounter[piece] < this.LIMIT_COUNT[piece]) {
      playerCounter[piece]++;
      this.updateState(playerCounter, player);
    }
  }

  public get whiteCounter(): CaptureCounter {
    return this.subject$.getValue().white;
  }

  public get blackCounter(): CaptureCounter {
    return this.subject$.getValue().black;
  }

  public getState(): Observable<PieceCaptureCounter> {
    return this.state$;
  }
}
