import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '@app/data/services/seo.service';
import { ParticlesComponent } from '@app/presentation/components/particles/particles.component';

@Component({
  selector: 'app-notfound',
  standalone: true,
  imports: [ParticlesComponent, NgOptimizedImage, RouterLink],
  templateUrl: './notfound.component.html',
  styleUrl: './notfound.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

export default NotfoundComponent;
