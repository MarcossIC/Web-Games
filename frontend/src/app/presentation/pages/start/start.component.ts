import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ParticlesComponent } from '@app/presentation/components/particles/particles.component';

@Component({
  selector: 'app-start',
  standalone: true,
  imports: [CommonModule, ParticlesComponent, RouterLink],
  templateUrl: './start.component.html',
  styleUrl: './start.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartComponent {
  @ViewChildren('spanElement') spanElements!: QueryList<ElementRef>;

  isHovered: boolean[] = [false, false];

  constructor() {}

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
