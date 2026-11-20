import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { GalaxyTravel } from '@app-components/galaxy-background/galaxy-travel.service';

@Component({
  selector: 'app-start',
  standalone: true,
  templateUrl: './start.component.html',
  styleUrl: './start.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartComponent {
  protected readonly travel = inject(GalaxyTravel);

  constructor() {
    // Warms up the Games page while the visitor reads this one, so the
    // dive never waits on the network.
    afterNextRender(() => void import('@app-pages/games/games.component'));
  }
}

export default StartComponent;
