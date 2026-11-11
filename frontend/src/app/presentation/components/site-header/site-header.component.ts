import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GalaxyTravel } from '@app-components/galaxy-background/galaxy-travel.service';

/** Top bar with the way back to the Start Menu, for pages other than Start. */
@Component({
  selector: 'app-site-header',
  standalone: true,
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeaderComponent {
  protected readonly travel = inject(GalaxyTravel);
}
