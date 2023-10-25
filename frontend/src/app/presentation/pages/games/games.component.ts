import { Component, OnInit, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SeoService } from '@app/data/services/seo.service';
import { GAMES, iGAMES } from 'assets/constants/games';

@Component({
  selector: 'app-games',
  templateUrl: './games.component.html',
  styleUrls: ['./games.component.css']
})
export class GamesComponent implements OnInit {
  protected GAMES: iGAMES[] = GAMES;
  private seo = inject(SeoService);
  private title = inject(Title);
  constructor() { }

  ngOnInit(): void {
    this.title.setTitle("Game Galaxy - Selection Games");
    this.seo.generateTags({
      title: "Game Galaxy - Selection Games",
      description: "Page to preview and choose a game",
      slug: "games"
    });
  }

}
