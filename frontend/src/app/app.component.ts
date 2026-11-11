import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GalaxyBackgroundComponent } from '@app-components/galaxy-background/galaxy-background.component';
import { GalaxyTravel } from '@app-components/galaxy-background/galaxy-travel.service';

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [RouterOutlet, GalaxyBackgroundComponent],
})
export class AppComponent {
  protected readonly travel = inject(GalaxyTravel);
}
