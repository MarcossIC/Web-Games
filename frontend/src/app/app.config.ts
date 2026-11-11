import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  provideZoneChangeDetection,
} from '@angular/core';
import { GlobalErrorHandler } from '@app/data/services/global-error-handler.service';
import {
  PreloadAllModules,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  ViewTransitionInfo,
  withViewTransitions,
} from '@angular/router';
import routes from './app.routing';
import {
  provideClientHydration,
  withHttpTransferCacheOptions,
  withNoIncrementalHydration
} from '@angular/platform-browser';

/**
 * Trips between galaxy pages (Start <-> Games) are animated by the pages
 * and the camera themselves (see GalaxyTravel). A view transition on top
 * would freeze the screen for its snapshots in the middle of the camera
 * move, so those two skip it.
 */
function skipGalaxyTrips({ transition, from, to }: ViewTransitionInfo): void {
  const galaxyPaths = ['', 'games'];
  const fromPath = from.firstChild?.routeConfig?.path ?? '**';
  const toPath = to.firstChild?.routeConfig?.path ?? '**';
  if (galaxyPaths.includes(fromPath) && galaxyPaths.includes(toPath)) {
    transition.skipTransition();
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    // Angular is zoneless unless told otherwise. The games rely on zone.js:
    // their loops step out of it with runOutsideAngular and expect timers
    // and DOM events to refresh the page on their own.
    provideZoneChangeDetection(),
    // Page changes animate through the browser's View Transitions API;
    // the CSS lives in styles.css. Browsers without it just swap pages.
    provideRouter(
      routes,
      withViewTransitions({ onViewTransitionCreated: skipGalaxyTrips })
    ),
    provideHttpClient(withFetch()),
    provideClientHydration(withNoIncrementalHydration()),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
