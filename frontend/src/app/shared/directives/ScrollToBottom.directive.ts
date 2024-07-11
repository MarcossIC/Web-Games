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
  selector: '[scrollToBottom]',
})
export class ScrollToBottomDirective implements OnChanges {
  private el = inject(ElementRef);
  @Input({ required: true }) trigger: any;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['trigger']) {
      this.scrollToBottom();
    }
  }

  private scrollToBottom(): void {
    try {
      this.el.nativeElement.scrollTop = this.el.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Scroll to bottom failed:', err);
    }
  }
}
