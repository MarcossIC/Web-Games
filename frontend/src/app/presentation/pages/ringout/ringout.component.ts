import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  NgZone,
  PLATFORM_ID,
  untracked,
  viewChild,
} from '@angular/core';
import { keyActions } from '@app-input';
import { GameBarComponent } from '@app-components/game-bar/game-bar.component';
import { EndgameModalRingoutComponent } from '@app-components/endgame-modal-ringout/endgame-modal-ringout.component';
import { WelcomeRingoutModalComponent } from '@app-components/welcome-ringout-modal/welcome-ringout-modal.component';
import { RINGOUT_KEYS } from '@app/data/services/ringout/ringout-controls';
import { formatTime } from '@app/data/services/ringout/ringout-progress';
import { RingOutController } from '@app/data/services/ringout/RingOutController.service';
import { RingOutTable } from './ringout-table';

/** Above this the extra pixels cost a lot and are barely visible. */
const MAX_PIXEL_RATIO = 2;
/** How often the clock on screen moves on: it shows tenths. */
const CLOCK_EVERY_MS = 100;

@Component({
  standalone: true,
  selector: 'app-ringout',
  templateUrl: './ringout.component.html',
  styleUrl: './ringout.component.css',
  imports: [GameBarComponent, WelcomeRingoutModalComponent, EndgameModalRingoutComponent],
  // Here and not on the route, so the engine loads with the page (see app.routing.ts).
  providers: [RingOutController],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RingOutComponent {
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly screen = viewChild.required<ElementRef<HTMLCanvasElement>>('screen');

  protected readonly controller = inject(RingOutController);
  private readonly zone = inject(NgZone);
  private readonly destroy = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly total = this.controller.levels.length;
  protected readonly time = computed(() => formatTime(this.controller.elapsedMs()));
  protected readonly best = computed(() => {
    const best = this.controller.bestTime();
    return best === null ? '--' : formatTime(best);
  });
  protected readonly playing = computed(() => this.controller.phase() === 'playing');

  private table: RingOutTable | null = null;

  constructor() {
    keyActions(RINGOUT_KEYS, { on: 'keydown' }).subscribe(({ action }) => {
      const phase = this.controller.phase();
      if (action === 'pause') this.controller.togglePause();
      else if (action === 'retry' && (phase === 'playing' || phase === 'paused')) this.controller.retry();
      else if (action === 'hint') this.hint();
    });

    // A new level, or the same one again: the table lays out the new board.
    effect(() => {
      this.controller.round();
      untracked(() => this.table?.setBoard(this.controller.board));
    });
    // The pieces only answer while the level is played.
    effect(() => {
      const playing = this.playing();
      if (this.table) this.table.enabled = playing;
    });

    afterNextRender(() => this.boot());
  }

  protected pause(): void {
    this.controller.togglePause();
  }

  protected retry(): void {
    this.controller.retry();
  }

  protected hint(): void {
    const piece = this.controller.hint();
    this.table?.showHint(piece);
  }

  /** Sets up the canvas, its loop and its pointer, outside Angular. */
  private boot(): void {
    if (!this.browser) return;
    const canvas = this.screen().nativeElement;
    const stage = this.stage().nativeElement;

    this.zone.runOutsideAngular(() => {
      const table = new RingOutTable(canvas, {
        cleared: () => this.zone.run(() => this.controller.finish()),
      });
      this.table = table;
      table.setBoard(this.controller.board);
      table.enabled = this.playing();

      const fit = () => {
        const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
        table.resize(stage.clientWidth, stage.clientHeight, ratio);
      };
      fit();
      const resizes = new ResizeObserver(fit);
      resizes.observe(stage);

      const listeners: [string, (event: PointerEvent) => void][] = [
        ['pointerdown', (e) => table.pointerDown(e)],
        ['pointermove', (e) => table.pointerMove(e)],
        ['pointerup', (e) => table.pointerUp(e)],
        ['pointercancel', (e) => table.pointerCancel(e)],
        ['pointerleave', () => table.pointerLeave()],
      ];
      for (const [name, listener] of listeners) canvas.addEventListener(name, listener as EventListener);

      // A hidden tab stops the clock: the time of a level is time spent on it.
      const onVisibility = () => {
        if (this.document.visibilityState === 'hidden') this.zone.run(() => this.controller.pause());
      };
      this.document.addEventListener('visibilitychange', onVisibility);

      let frame = 0;
      let last = performance.now();
      let lastClock = 0;
      const loop = (now: number) => {
        frame = requestAnimationFrame(loop);
        table.frame((now - last) / 1000);
        last = now;
        if (now - lastClock >= CLOCK_EVERY_MS && this.controller.phase() === 'playing') {
          lastClock = now;
          this.zone.run(() => this.controller.tick());
        }
      };
      frame = requestAnimationFrame(loop);

      this.destroy.onDestroy(() => {
        cancelAnimationFrame(frame);
        resizes.disconnect();
        for (const [name, listener] of listeners) canvas.removeEventListener(name, listener as EventListener);
        this.document.removeEventListener('visibilitychange', onVisibility);
      });
    });
  }
}

export default RingOutComponent;
