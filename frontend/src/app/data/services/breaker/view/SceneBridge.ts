import * as Phaser from 'phaser';
import { BreakerBridgeEvents } from '@app/data/models/breaker/BreakerBridge';
import { EventBus } from '@app/data/services/phaser/EventBus';
import type { RunSummary } from '../engine/types';

/** What the page can ask of the scene. */
export interface BridgeHost {
  play(): void;
  pause(): void;
  restart(): void;
  setMuted(muted: boolean): void;
  /** The window lost focus or the tab was hidden. */
  lostFocus(): void;
}

/**
 * The scene's side of BreakerBridgeEvents (EventBus) plus the game's
 * BLUR / HIDDEN. Named handlers with this as context, all removed in
 * destroy(): the EventBus outlives every game, so a leftover listener would
 * drive a dead scene the next time /breaker opens.
 */
export class SceneBridge {
  constructor(
    private readonly game: Phaser.Game,
    private readonly host: BridgeHost
  ) {
    EventBus.on(BreakerBridgeEvents.PLAY, this.onPlay, this);
    EventBus.on(BreakerBridgeEvents.PAUSE, this.onPause, this);
    EventBus.on(BreakerBridgeEvents.RESTART, this.onRestart, this);
    EventBus.on(BreakerBridgeEvents.SET_MUTED, this.onSetMuted, this);
    game.events.on(Phaser.Core.Events.BLUR, this.onLostFocus, this);
    game.events.on(Phaser.Core.Events.HIDDEN, this.onLostFocus, this);
  }

  ready(): void {
    EventBus.emit(BreakerBridgeEvents.READY);
  }

  autoPaused(): void {
    EventBus.emit(BreakerBridgeEvents.AUTO_PAUSED);
  }

  runEnding(): void {
    EventBus.emit(BreakerBridgeEvents.RUN_ENDING);
  }

  gameOver(summary: RunSummary): void {
    EventBus.emit(BreakerBridgeEvents.GAME_OVER, summary);
  }

  destroy(): void {
    EventBus.off(BreakerBridgeEvents.PLAY, this.onPlay, this);
    EventBus.off(BreakerBridgeEvents.PAUSE, this.onPause, this);
    EventBus.off(BreakerBridgeEvents.RESTART, this.onRestart, this);
    EventBus.off(BreakerBridgeEvents.SET_MUTED, this.onSetMuted, this);
    this.game.events?.off(Phaser.Core.Events.BLUR, this.onLostFocus, this);
    this.game.events?.off(Phaser.Core.Events.HIDDEN, this.onLostFocus, this);
  }

  private onPlay(): void {
    this.host.play();
  }

  private onPause(): void {
    this.host.pause();
  }

  private onRestart(): void {
    this.host.restart();
  }

  private onSetMuted(muted: unknown): void {
    this.host.setMuted(muted === true);
  }

  private onLostFocus(): void {
    this.host.lostFocus();
  }
}
