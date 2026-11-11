import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/**
 * Where the galaxy camera is:
 * - `orbit`: outside, the whole galaxy low on the horizon (Start).
 * - `core`: inside the disc, close to the core (Games).
 * - `launch`: plunging into the core, on the way into a game.
 */
export type GalaxyView = 'orbit' | 'core' | 'launch';

/**
 * The camera view of each site page. Only these pages show the galaxy:
 * game pages paint their own backdrop, and they should not share the GPU
 * with a second WebGL scene.
 */
const GALAXY_VIEWS: Record<string, GalaxyView> = {
  '/': 'orbit',
  '/games': 'core',
};

/** How long the page being left gets to play its exit animation. */
export const EXIT_MS = 420;

const viewOf = (url: string): GalaxyView | undefined =>
  GALAXY_VIEWS[url.split(/[?#]/)[0]];

/**
 * Navigation between galaxy pages, staged as a trip:
 * the camera starts moving on the click itself, the current page plays
 * its exit (`leaving`), and only then the router swaps pages. Doing the
 * swap after the exit keeps the heavy work of mounting the next page out
 * of the first, most visible part of the camera move.
 */
@Injectable({ providedIn: 'root' })
export class GalaxyTravel {
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  /** The view we are heading to, while a trip is under way. */
  private readonly destination = signal<GalaxyView | undefined>(undefined);

  /** True while the current page should play its exit animation. */
  readonly leaving = signal(false);

  /** The view the galaxy should show, or undefined for no galaxy. */
  readonly view = computed(() => this.destination() ?? viewOf(this.url()));

  to(url: string): void {
    if (this.leaving()) return;

    // A game page has no galaxy of its own: on the way there the camera
    // plunges into the core, and the game opens at the end of the plunge.
    this.destination.set(viewOf(url) ?? 'launch');
    this.leaving.set(true);
    setTimeout(() => {
      this.router.navigateByUrl(url).finally(() => {
        this.leaving.set(false);
        this.destination.set(undefined);
      });
    }, EXIT_MS);
  }

  /**
   * Click handler for a plain `<a href>`: travels on a normal click and
   * leaves modified clicks (new tab, new window) to the browser.
   */
  follow(event: MouseEvent, url: string): void {
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    this.to(url);
  }
}
