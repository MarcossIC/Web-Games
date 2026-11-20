import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { InstallOffer } from '@app-services/pwa/install-prompt.service';

/**
 * Suggests installing the site as an app. It only shows the offer and
 * reports the answer: what to offer, and what a "no" means, is decided by
 * InstallPrompt.
 */
@Component({
  selector: 'app-install-banner',
  standalone: true,
  templateUrl: './install-banner.component.html',
  styleUrl: './install-banner.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstallBannerComponent {
  readonly offer = input.required<InstallOffer>();

  readonly accept = output<void>();
  readonly dismiss = output<void>();
}
