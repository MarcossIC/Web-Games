import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, ErrorHandler } from '@angular/core';
import { GlobalErrorHandler } from '@app/data/services/global-error-handler.service';
import {
  PreloadAllModules,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
} from '@angular/router';
import routes from './app.routing';
import {
  provideClientHydration,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideClientHydration(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
