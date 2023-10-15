import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SeoService } from '@app/data/services/seo.service';

@Component({
  selector: 'app-games',
  templateUrl: './games.component.html',
  styleUrls: ['./games.component.css']
})
export class GamesComponent implements OnInit {

  constructor(private seo: SeoService, private title: Title) { }

  ngOnInit(): void {
    this.title.setTitle("Games Option");
    this.seo.generateTags({
      title: "Games Option",
      description: "Page to preview and choose a game",
      slug: "games"
    });
  }

}
