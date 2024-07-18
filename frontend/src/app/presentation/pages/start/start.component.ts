import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-start',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './start.component.html',
  styleUrl: './start.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartComponent {}

export default StartComponent;
