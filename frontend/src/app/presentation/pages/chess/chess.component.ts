import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SeoService } from '@app/data/services/seo.service';

@Component({
  selector: 'app-chess',
  standalone: true,
  templateUrl: './chess.component.html',
  styleUrl: './chess.component.css',
})
export class ChessComponent implements OnInit {
  protected seo = inject(SeoService);
  protected title = inject(Title);

  constructor() {}

  ngOnInit(): void {
    this.title.setTitle('Game Galaxy - Chess Game');
    this.seo.generateTags({
      title: 'Games Galaxy - Chess Game',
      description: 'Page to play a chess',
      slug: 'chess',
    });
  }
}
