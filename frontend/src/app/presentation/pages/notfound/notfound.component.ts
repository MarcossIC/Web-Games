import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ParticlesComponent } from '@app/presentation/components/particles/particles.component';

@Component({
  selector: 'app-notfound',
  standalone: true,
  imports: [ParticlesComponent, NgOptimizedImage, RouterLink],
  templateUrl: './notfound.component.html',
  styleUrl: './notfound.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotfoundComponent {}

export default NotfoundComponent;
