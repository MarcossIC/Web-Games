import { Injectable } from '@angular/core';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import PawnPiece from '@app/data/services/chess/PawnPiece';
import { Piece } from '@app/data/services/chess/Piece';

@Injectable()
export class ChessMoveCounter {
  private _fiftyMoveRuleCounter: number;
  private _fullNumberOfMoves: number;
  private _threeFoldRepetitionDictionary: Map<string, number>;
  private _threeFoldRepetitionFlag: boolean;

  constructor() {
    this._fullNumberOfMoves = 1;
    this._fiftyMoveRuleCounter = 0;
    this._threeFoldRepetitionFlag = false;
    this._threeFoldRepetitionDictionary = new Map<string, number>();
  }

  public resetState() {
    this._fullNumberOfMoves = 1;
    this._fiftyMoveRuleCounter = 0;
    this._threeFoldRepetitionFlag = false;
    this._threeFoldRepetitionDictionary = new Map<string, number>();
  }

  public updateFiftyMoveRuleCounter(piece: Piece, newPosition: Piece) {
    if (piece instanceof PawnPiece || !newPosition.isEmpty()) {
      this._fiftyMoveRuleCounter = 0;
    } else {
      this._fiftyMoveRuleCounter += 0.5;
    }
  }

  public updateFullMoveCounter(currentTurn: ChessPlayers) {
    if (currentTurn === ChessPlayers.WHITE) {
      this._fullNumberOfMoves++;
    }
  }

  public updateThreeFoldRepetitionDictionary(symbolPiece: string): void {
    const threeFoldRepetitionSymbolKey: string = symbolPiece
      .split(' ')
      .slice(0, 4)
      .join('');
    const threeFoldRepetionValue: number | undefined =
      this._threeFoldRepetitionDictionary.get(threeFoldRepetitionSymbolKey);

    if (threeFoldRepetionValue === undefined) {
      this._threeFoldRepetitionDictionary.set(threeFoldRepetitionSymbolKey, 1);
    } else {
      if (threeFoldRepetionValue === 2) {
        this._threeFoldRepetitionFlag = true;
        return;
      }
      this._threeFoldRepetitionDictionary.set(threeFoldRepetitionSymbolKey, 2);
    }
  }

  public isFulfilledFiftyRuleCounter() {
    return this._fiftyMoveRuleCounter >= 50;
  }

  public get fiftyMoveRuleCounter() {
    return this._fiftyMoveRuleCounter;
  }
  public get fullNumberOfMoves() {
    return this._fullNumberOfMoves;
  }
  public get threeFoldRepetitionDictionary() {
    return this._threeFoldRepetitionDictionary;
  }
  public get threeFoldRepetitionFlag() {
    return this._threeFoldRepetitionFlag;
  }

  public set fiftyMoveRuleCounter(updated: number) {
    this._fiftyMoveRuleCounter = updated;
  }
  public set fullNumberOfMoves(updated: number) {
    this._fullNumberOfMoves = updated;
  }
  public set threeFoldRepetitionDictionary(updated: Map<string, number>) {
    this._threeFoldRepetitionDictionary = updated;
  }
  public set threeFoldRepetitionFlag(updated: boolean) {
    this._threeFoldRepetitionFlag = updated;
  }
}
