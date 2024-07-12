import { AsyncPipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import {
  CaptureCounter,
  PieceCaptureCounter,
} from '@app/data/models/chess/chess-capturedpieces';
import { ChessPlayers } from '@app/data/models/chess/chess-players';
import { ChessCaptureCounter } from '@app/data/services/chess/ChessCaptureCounter.service';
import { Observable } from 'rxjs';

@Component({
  standalone: true,
  imports: [AsyncPipe, NgClass],
  selector: 'chess-captured-pieces',
  template: `
    @if(capturedPieces | async; as counters){
    <div class="captured-pieces">
      @if(getCounter(counters); as counter){ @if(counter.pawns > 0){
      <span
        class="new-captured-pieces"
        [ngClass]="[
          getCapturedClass('captured-pawns', counter.pawns),
          getPlayerColor()
        ]"
      ></span>
      } @if(counter.bishop > 0){
      <span
        class="new-captured-pieces"
        [ngClass]="[
          getCapturedClass('captured-bishop', counter.bishop),
          getPlayerColor()
        ]"
      ></span>
      }@if(counter.knight > 0){
      <span
        class="new-captured-pieces"
        [ngClass]="[
          getCapturedClass('captured-knight', counter.knight),
          getPlayerColor()
        ]"
      ></span>
      }@if(counter.rook > 0){
      <span
        class="new-captured-pieces"
        [ngClass]="[
          getCapturedClass('captured-rook', counter.rook),
          getPlayerColor()
        ]"
      ></span>
      }@if(counter.queen > 0){
      <span
        class="new-captured-pieces captured-queen"
        [ngClass]="[getPlayerColor()]"
      ></span>
      } }
    </div>
    }
  `,
  styleUrl: './chess-captured-pieces.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChessCapturedPieces {
  public player = input<ChessPlayers>(ChessPlayers.BLACK);
  private captureCounter = inject(ChessCaptureCounter);
  protected capturedPieces: Observable<PieceCaptureCounter>;

  constructor() {
    this.capturedPieces = this.captureCounter.getState();
  }

  public getCounter(counters: PieceCaptureCounter | null): CaptureCounter {
    if (!counters) return this.captureCounter.getDefault();
    return this.player() === 1 ? counters.white : counters.black;
  }

  public onLoad(counters: PieceCaptureCounter | null) {
    const counter = this.getCounter(counters);
    return Object.keys(counter).some(
      (key) => counter[key as keyof typeof counter] !== 0
    );
  }

  public getCapturedClass(use: string, counter: number) {
    return `${use}-${counter}`;
  }

  public getPlayerColor() {
    return this.player() === 1 ? 'white' : 'black';
  }
}
