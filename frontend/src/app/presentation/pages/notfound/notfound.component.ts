import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-notfound',
  standalone: true,
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './notfound.component.html',
  styleUrl: './notfound.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotfoundComponent {}

export default NotfoundComponent;
