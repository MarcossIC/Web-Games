import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { BreakerBridgeEvents } from '@app/data/models/breaker/BreakerBridge';
import type { RunSummary } from '@app/data/services/breaker/engine/types';
import {
  loadRecords,
  recordRun,
  type BreakerRecords,
} from '@app/data/services/breaker/engine/records';
import { MUTED_STORAGE_KEY, parseMuted, serializeMuted } from '@app/data/services/breaker/assets/audio-math';
import { EventBus } from '@app/data/services/phaser/EventBus';

/** '0' = the player turned the mouse capture off; anything else (or nothing) = on. */
export const CAPTURE_MOUSE_STORAGE_KEY = 'breaker-capture-mouse';

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
  readonly records = signal<BreakerRecords>(loadRecords(this.storage()));
  readonly muted = signal<boolean>(this.readMuted());
  /** Keep the mouse locked inside the canvas while playing (see CanvasPointerLock). */
  readonly captureMouse = signal<boolean>(this.readCaptureMouse());

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
    this.records.set(loadRecords(this.storage()));
    this.muted.set(this.readMuted());
    this.ending = false;

    EventBus.on(BreakerBridgeEvents.READY, this.onReady, this);
    EventBus.on(BreakerBridgeEvents.AUTO_PAUSED, this.onAutoPaused, this);
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
    const muted = !this.muted();
    this.muted.set(muted);
    // The controller owns the flag: persist it here, no scene may be listening yet.
    try {
      this.storage().setItem(MUTED_STORAGE_KEY, serializeMuted(muted));
    } catch {
      // Blocked storage: the flag lives for this visit only.
    }
    EventBus.emit(BreakerBridgeEvents.SET_MUTED, muted);
  }

  toggleCaptureMouse(): void {
    const on = !this.captureMouse();
    this.captureMouse.set(on);
    try {
      this.storage().setItem(CAPTURE_MOUSE_STORAGE_KEY, on ? '1' : '0');
    } catch {
      // Blocked storage: the choice lives for this visit only.
    }
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

  /** The page owns P, Esc (pause), M (mute) and L (mouse lock); the scene reads the rest. */
  handleKey(event: KeyboardEvent): void {
    // Ctrl+P (print), Ctrl+L (address bar), Cmd+M (minimize), Alt combos: the browser's, not ours.
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'escape' && event.timeStamp - this.lockLostAt < ESC_ECHO_MS) return;
    if (key === 'p' || key === 'escape') this.togglePause();
    else if (key === 'm') this.toggleMute();
    else if (key === 'l') this.toggleCaptureMouse();
  }

  private readonly onReady = (): void => {
    this.phase.set('intro');
    // A scene created after a toggle (loading, restart) never heard it: tell it now.
    EventBus.emit(BreakerBridgeEvents.SET_MUTED, this.muted());
  };

  private readonly onAutoPaused = (): void => {
    if (this.phase() === 'playing' && !this.ending) this.phase.set('paused');
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
      const outcome = recordRun(summary, this.storage(), new Date());
      this.result.set(outcome);
      this.records.set(outcome.records);
    }
    this.phase.set('over');
  };

  /** localStorage, or an empty stand-in where it is blocked or missing. */
  private storage(): Pick<Storage, 'getItem' | 'setItem'> {
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
    } catch {
      // Access denied (private mode, blocked site data).
    }
    return { getItem: () => null, setItem: () => undefined };
  }

  private readCaptureMouse(): boolean {
    try {
      return this.storage().getItem(CAPTURE_MOUSE_STORAGE_KEY) !== '0';
    } catch {
      return true;
    }
  }

  private readMuted(): boolean {
    try {
      return parseMuted(this.storage().getItem(MUTED_STORAGE_KEY));
    } catch {
      return false;
    }
  }
}
