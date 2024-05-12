import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChildren,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '@app/data/services/seo.service';
import { ParticlesComponent } from '@app/presentation/components/particles/particles.component';

@Component({
  selector: 'app-start',
  standalone: true,
  imports: [CommonModule, ParticlesComponent, RouterLink],
  templateUrl: './start.component.html',
  styleUrl: './start.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartComponent implements OnInit {
  @ViewChildren('spanElement') spanElements!: QueryList<ElementRef>;

  isHovered: boolean[] = [false, false];

  private seo = inject(SeoService);

  constructor() {}

  ngOnInit(): void {
    this.seo.generateTags({
      title: 'Game Galaxy - Start Page',
      description: 'Start Page',
      slug: '',
    });
  }

  onHover(index: number): void {
    this.spanElements.toArray().forEach((spanElement, i) => {
      const condition = index === i;
      spanElement.nativeElement.style.opacity = condition ? '1' : '0';
      spanElement.nativeElement.style.animation = condition
        ? 'left-right 1s linear infinite normal forwards'
        : 'none';
    });
  }

  notHover() {
    this.spanElements.toArray().forEach((spanElement, i) => {
      spanElement.nativeElement.style.opacity = '0';
      spanElement.nativeElement.style.animation = 'none';
    });
  }
}

export default StartComponent;
