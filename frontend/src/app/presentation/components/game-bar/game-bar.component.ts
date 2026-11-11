import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Top bar of a game page: the way out, the name of the game and pause.
 * The bar only asks for a pause; each game decides what pausing means.
 */
@Component({
  selector: 'app-game-bar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './game-bar.component.html',
  styleUrl: './game-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameBarComponent {
  readonly title = input.required<string>();
  /** False for a game with nothing to pause: the button is left out. */
  readonly canPause = input(true);
  readonly pause = output<void>();
}
