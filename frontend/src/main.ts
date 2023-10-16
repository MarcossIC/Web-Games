import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { ViewEncapsulation } from '@angular/core';


platformBrowserDynamic().bootstrapModule(AppModule, [{
  defaultEncapsulation: ViewEncapsulation.None
}]).catch(err => console.error(err));
