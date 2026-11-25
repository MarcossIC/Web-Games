import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { dismissBootScreen } from './app/shared/boot-screen';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err))
  // Even after a failure: a boot screen that never ends hides the error.
  .finally(() => dismissBootScreen());
