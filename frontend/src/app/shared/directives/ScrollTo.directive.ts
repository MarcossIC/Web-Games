import {
  Directive,
  ElementRef,
  inject,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

@Directive({
  standalone: true,
  selector: '[scrollTo]',
})
export class ScrollToDirective implements OnChanges {
  private el = inject(ElementRef);
  @Input({ required: true }) trigger: any;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['trigger'] && this.trigger >= 5) {
      this.scrollIntoView();
    }
  }

  private scrollIntoView(): void {
    this.el.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }
}
