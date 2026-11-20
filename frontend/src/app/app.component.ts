import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GalaxyBackgroundComponent } from '@app-components/galaxy-background/galaxy-background.component';
import { GalaxyTravel } from '@app-components/galaxy-background/galaxy-travel.service';
import { InstallBannerComponent } from '@app-components/install-banner/install-banner.component';
import { InstallPrompt } from '@app-services/pwa/install-prompt.service';

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterOutlet, GalaxyBackgroundComponent, InstallBannerComponent],
})
export class AppComponent {
  protected readonly travel = inject(GalaxyTravel);
  // Injected here, at startup, so it is already listening when the browser
  // announces that the site can be installed: that happens only once.
  protected readonly install = inject(InstallPrompt);
}
