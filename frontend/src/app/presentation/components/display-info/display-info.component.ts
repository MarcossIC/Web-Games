import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'display-info',
  templateUrl: './display-info.component.html',
  styleUrls: ['./display-info.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisplayInfoComponent {
  @Input({ required: true }) public captionX: string = '';
  @Input({ required: true }) public captionO: string = '';
  @Input({ required: true }) public xCurrent: boolean = false;
  @Input({ required: true }) public oCurrent: boolean = false;
  @Input() public displayClass: string[] = [];
}
