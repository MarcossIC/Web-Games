import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '@app/data/services/seo.service';

@Component({
  selector: 'app-notfound',
  templateUrl: './notfound.component.html',
  styleUrls: ['./notfound.component.css'],
})
export class NotfoundComponent implements OnInit {
  private seo = inject(SeoService);

  constructor() {}

  ngOnInit(): void {
    this.seo.generateTags({
      title: 'Not Found',
      description: 'Not Found page, sorry',
      slug: '/notfound',
    });
  }
}
