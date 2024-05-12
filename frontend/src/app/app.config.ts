import { HttpClientModule } from '@angular/common/http';
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withPreloading } from '@angular/router';
import { CustomPreloadStrategyService } from './data/services/CustomPreloadStrategy.service';
import routes from './app.routing';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withPreloading(CustomPreloadStrategyService)),
    importProvidersFrom(HttpClientModule),
  ],
};
