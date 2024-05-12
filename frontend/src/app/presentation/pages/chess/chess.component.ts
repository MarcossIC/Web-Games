import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '@app/data/services/seo.service';

@Component({
  selector: 'app-chess',
  standalone: true,
  templateUrl: './chess.component.html',
  styleUrl: './chess.component.css',
})
export class ChessComponent implements OnInit {
  protected seo = inject(SeoService);

  constructor() {}

  ngOnInit(): void {
    this.seo.generateTags({
      title: 'Games Galaxy - Chess Game',
      description: 'Page to play a chess',
      slug: 'chess',
    });
  }
}
