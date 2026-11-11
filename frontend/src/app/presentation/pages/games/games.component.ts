import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { GalaxyTravel } from '@app-components/galaxy-background/galaxy-travel.service';
import { PixelEmblemComponent } from '@app-components/pixel-emblem/pixel-emblem.component';
import { SiteHeaderComponent } from '@app-components/site-header/site-header.component';
import { GAMES, iGAMES } from 'assets/constants/games';

@Component({
  selector: 'app-games',
  standalone: true,
  imports: [PixelEmblemComponent, SiteHeaderComponent],
  templateUrl: './games.component.html',
  styleUrl: './games.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesComponent {
  protected GAMES: iGAMES[] = GAMES;
  protected readonly travel = inject(GalaxyTravel);

  /** The game whose details the side panel shows. */
  protected readonly selected = signal<iGAMES>(GAMES[0]);

  /** The game being opened, while its launch animation plays. */
  protected readonly launching = signal<iGAMES | null>(null);

  /**
   * Hover or keyboard focus only previews a game in the panel.
   * Clicking a cartridge still goes straight to the game, so touch
   * devices keep the one-tap flow.
   */
  protected select(game: iGAMES): void {
    if (this.launching()) return;
    this.selected.set(game);
  }

  /** Opens a game: its cartridge comes forward while the camera plunges. */
  protected launch(event: MouseEvent, game: iGAMES): void {
    this.travel.follow(event, game.PATH);
    // `follow` leaves modified clicks (new tab) to the browser.
    if (!event.defaultPrevented) return;
    this.selected.set(game);
    this.launching.set(game);
  }
}

export default GamesComponent;
