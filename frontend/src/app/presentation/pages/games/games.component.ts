import { CommonModule, NgForOf, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '@app/data/services/seo.service';
import { ParticlesComponent } from '@app/presentation/components/particles/particles.component';
import { GAMES, iGAMES } from 'assets/constants/games';

@Component({
  selector: 'app-games',
  standalone: true,
  imports: [
    CommonModule,
    ParticlesComponent,
    NgOptimizedImage,
    RouterLink,
    NgForOf,
  ],
  templateUrl: './games.component.html',
  styleUrl: './games.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesComponent implements OnInit {
  protected GAMES: iGAMES[] = GAMES;
  private seo = inject(SeoService);
  constructor() {}

  ngOnInit(): void {
    this.seo.generateTags({
      title: 'Game Galaxy - Selection Games',
      description: 'Page to preview and choose a game',
      slug: 'games',
    });
  }
}

export default GamesComponent;
