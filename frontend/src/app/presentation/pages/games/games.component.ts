import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '@app/data/services/seo.service';
import { GAMES, iGAMES } from 'assets/constants/games';

@Component({
  selector: 'app-games',
  templateUrl: './games.component.html',
  styleUrls: ['./games.component.css'],
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
