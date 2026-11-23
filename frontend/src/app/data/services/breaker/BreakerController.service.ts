import { computed, DestroyRef, Injectable, inject, signal } from '@angular/core';
import { BreakerBridgeEvents } from '@app/data/models/breaker/BreakerBridge';
import type { RunSummary } from '@app/data/services/breaker/engine/types';
import { recordRun, type BreakerRecords } from '@app/data/services/breaker/engine/records';
import { breakerRecords, breakerSettings } from '@app/data/services/breaker/breaker-saves';
import type { BreakerPageAction } from '@app/data/services/breaker/breaker-controls';
import { EventBus } from '@app/data/services/phaser/EventBus';
import { persisted } from '@app-persistence';

/**
 * An Esc this close after the browser broke the lock is the same press: some
 * browsers also deliver its keydown, which would resume the run it paused.
 */
const ESC_ECHO_MS = 500;

export type BreakerPhase = 'loading' | 'intro' | 'playing' | 'paused' | 'over';

/** What recordRun answered for the run that just ended. */
export interface BreakerRunResult {
  records: BreakerRecords;
  newBestScore: boolean;
  newSectorBests: number[];
}

/**
 * Owns the flow of a Nova Breaker run for the Angular side: which dialog
 * shows, what the scene is told, and the records. The scene owns the run
 * itself; both talk through the EventBus (see BreakerBridgeEvents).
 */
@Injectable()
export class BreakerControllerService {
  readonly phase = signal<BreakerPhase>('loading');
  readonly summary = signal<RunSummary | null>(null);
  readonly result = signal<BreakerRunResult | null>(null);
  private readonly savedRecords = persisted(breakerRecords);
  readonly records = this.savedRecords.value;
  /** The controller is the one owner of the settings: the scene hears them through SET_MUTED. */
  private readonly savedSettings = persisted(breakerSettings);
  readonly muted = computed(() => this.savedSettings.value().muted);
  /** Keep the mouse locked inside the canvas while playing (see CanvasPointerLock). */
  readonly captureMouse = computed(() => this.savedSettings.value().captureMouse);

  /** The scene said the last life is gone: GAME_OVER is on its way, no pausing now. */
  private ending = false;
  private connected = false;
  private lockLostAt = Number.NEGATIVE_INFINITY;
  private unregisterOwner: (() => void) | null = null;

  constructor() {
    // A safety net only: the router caches route injectors (no
    // withAutoCleanupInjectors), so this rarely runs. The page's own
    // DestroyRef, passed to connect, is what disconnects each visit.
    inject(DestroyRef).onDestroy(() => this.disconnect());
  }

  /**
   * Subscribes to the scene's events for one visit of the page and starts
   * that visit clean. The service lives as long as the route's injector,
   * which outlives the page, so the listeners are tied to `owner` (the
   * page's DestroyRef) instead. Calling it again first drops the previous
   * connection: the listeners are never doubled.
   */
  connect(owner: DestroyRef): void {
    this.disconnect();
    this.phase.set('loading');
    this.summary.set(null);
    this.result.set(null);
    this.savedRecords.reload();
    this.savedSettings.reload();
    this.ending = false;

    EventBus.on(BreakerBridgeEvents.READY, this.onReady, this);
    EventBus.on(BreakerBridgeEvents.AUTO_PAUSED, this.onAutoPaused, this);
    EventBus.on(BreakerBridgeEvents.PAUSE_REQUESTED, this.onPauseRequested, this);
    EventBus.on(BreakerBridgeEvents.RUN_ENDING, this.onRunEnding, this);
    EventBus.on(BreakerBridgeEvents.GAME_OVER, this.onGameOver, this);
    this.connected = true;
    this.unregisterOwner = owner.onDestroy(() => this.disconnect());
  }

  private disconnect(): void {
    if (!this.connected) return;
    this.connected = false;
    EventBus.off(BreakerBridgeEvents.READY, this.onReady, this);
    EventBus.off(BreakerBridgeEvents.AUTO_PAUSED, this.onAutoPaused, this);
    EventBus.off(BreakerBridgeEvents.PAUSE_REQUESTED, this.onPauseRequested, this);
    EventBus.off(BreakerBridgeEvents.RUN_ENDING, this.onRunEnding, this);
    EventBus.off(BreakerBridgeEvents.GAME_OVER, this.onGameOver, this);
    const unregister = this.unregisterOwner;
    this.unregisterOwner = null;
    try {
      unregister?.();
    } catch {
      // The owner is already being destroyed.
    }
  }

  play(): void {
    const phase = this.phase();
    if (phase !== 'intro' && phase !== 'paused') return;
    this.phase.set('playing');
    EventBus.emit(BreakerBridgeEvents.PLAY);
  }

  pause(): void {
    if (this.phase() !== 'playing' || this.ending) return;
    this.phase.set('paused');
    EventBus.emit(BreakerBridgeEvents.PAUSE);
  }

  togglePause(): void {
    if (this.phase() === 'playing') this.pause();
    else if (this.phase() === 'paused') this.play();
  }

  restart(): void {
    const phase = this.phase();
    if (phase !== 'over' && phase !== 'paused') return;
    this.summary.set(null);
    this.result.set(null);
    this.ending = false;
    this.phase.set('playing');
    EventBus.emit(BreakerBridgeEvents.RESTART);
  }

  toggleMute(): void {
    // Saved here, not in the scene: no scene may be listening yet.
    this.savedSettings.update((settings) => ({ ...settings, muted: !settings.muted }));
    EventBus.emit(BreakerBridgeEvents.SET_MUTED, this.muted());
  }

  toggleCaptureMouse(): void {
    this.savedSettings.update((settings) => ({ ...settings, captureMouse: !settings.captureMouse }));
  }

  /**
   * The browser broke the mouse lock during a run (Esc, a lost focus): the
   * cursor is free again, so the run pauses. `at` is the event's timeStamp.
   */
  lockLost(at: number): void {
    if (this.phase() !== 'playing') return;
    this.lockLostAt = at;
    this.pause();
  }

  /**
   * The page owns P, Esc (pause), M (mute) and L (mouse lock); the scene
   * reads the rest. Which keys, and that Ctrl+P (print), Ctrl+L (address
   * bar), Cmd+M (minimize) and Alt combos are the browser's, is in
   * BREAKER_PAGE_KEYS. `at` is the key's timeStamp.
   */
  handleAction(action: BreakerPageAction, at: number): void {
    if (action === 'escape' && at - this.lockLostAt < ESC_ECHO_MS) return;
    if (action === 'pause' || action === 'escape') this.togglePause();
    else if (action === 'mute') this.toggleMute();
    else if (action === 'mouse-lock') this.toggleCaptureMouse();
  }

  private readonly onReady = (): void => {
    this.phase.set('intro');
    // A scene created after a toggle (loading, restart) never heard it: tell it now.
    EventBus.emit(BreakerBridgeEvents.SET_MUTED, this.muted());
  };

  private readonly onAutoPaused = (): void => {
    if (this.phase() === 'playing' && !this.ending) this.phase.set('paused');
  };

  /** The HUD Pause button: the same path as P, so the page shows its pause screen and the scene hears PAUSE. */
  private readonly onPauseRequested = (): void => {
    this.pause();
  };

  private readonly onRunEnding = (): void => {
    this.ending = true;
  };

  private readonly onGameOver = (summary: RunSummary): void => {
    this.ending = false;
    this.summary.set(summary);
    if (summary.practice) {
      // A run started past sector 1 proves nothing: it never touches the records.
      this.result.set(null);
    } else {
      const outcome = recordRun(this.records(), summary, new Date());
      this.result.set(outcome);
      this.savedRecords.set(outcome.records);
    }
    this.phase.set('over');
  };
}
