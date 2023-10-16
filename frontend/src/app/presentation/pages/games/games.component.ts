import { Component, OnInit, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SeoService } from '@app/data/services/seo.service';
import { GAMES, iGAMES } from './games';

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
    this.title.setTitle("Games Option");
    this.seo.generateTags({
      title: "Games Option",
      description: "Page to preview and choose a game",
      slug: "games"
    });
  }

}
