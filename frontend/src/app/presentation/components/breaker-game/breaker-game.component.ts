import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  effect,
  inject,
} from '@angular/core';
import { BreakerControllerService } from '@app/data/services/breaker/BreakerController.service';
import StartBreaker from '@app/data/services/breaker/main';
import { CanvasPointerLock } from '@app/data/services/breaker/pointer-lock';
import { hasMouse } from '@app/data/services/breaker/view/input-device';
import type { Game } from 'phaser';

/** Hosts the Phaser game of Nova Breaker. */
@Component({
  standalone: true,
  selector: 'breaker-game',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div id="breaker-game"></div>',
  host: { '(pointerdown)': 'lock?.retry()' },
})
export class BreakerGameComponent implements OnInit, OnDestroy {
  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);
  private controller = inject(BreakerControllerService);
  public game?: Game;
  /** Keeps the mouse inside the canvas while a run is played, if the player wants it. */
  protected lock?: CanvasPointerLock;

  constructor() {
    // Runs on every phase or option change: Play, P, L and Resume are gestures, so
    // the browser grants the lock; a pause, the game over or L again release it.
    effect(() => {
      const wanted = this.controller.phase() === 'playing' && this.controller.captureMouse();
      this.lock?.set(wanted);
    });
  }

  ngOnInit(): void {
    // Phaser needs a window, a canvas and a document: none of them on the server.
    if (!isPlatformBrowser(this.platformId)) return;
    const records = this.controller.records;
    // Phaser's loop ticks every frame: outside the zone, so none of those
    // ticks triggers a change detection.
    this.ngZone.runOutsideAngular(() => {
      this.game = StartBreaker('breaker-game', () => records());
    });
    // A phone or a tablet without a mouse has no cursor to keep in.
    if (!hasMouse(this.document.defaultView ?? undefined)) return;
    this.lock = new CanvasPointerLock(
      this.document,
      () => this.game?.canvas ?? null,
      (at) => this.ngZone.run(() => this.controller.lockLost(at))
    );
  }

  ngOnDestroy(): void {
    this.lock?.destroy();
    this.lock = undefined;
    this.game?.destroy(true);
    this.game = undefined;
  }
}
