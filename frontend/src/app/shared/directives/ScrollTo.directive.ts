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
    console.log('Execute?');
    if (changes['trigger']) {
      this.scrollIntoView();
    }
  }

  private scrollIntoView(): void {
    console.log('Enter?');
    this.el.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }
}
