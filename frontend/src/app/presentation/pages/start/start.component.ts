import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
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
export class StartComponent {}

export default StartComponent;
