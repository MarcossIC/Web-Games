import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ParticlesComponent } from '@app/presentation/components/particles/particles.component';
import { GAMES, iGAMES } from 'assets/constants/games';

@Component({
  selector: 'app-games',
  standalone: true,
  imports: [CommonModule, ParticlesComponent, NgOptimizedImage, RouterLink],
  templateUrl: './games.component.html',
  styleUrl: './games.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesComponent {
  protected GAMES: iGAMES[] = GAMES;
}

export default GamesComponent;
