import {
  AfterViewChecked,
  ChangeDetectorRef,
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
export class ScrollToBottomDirective implements AfterViewChecked {
  private el = inject(ElementRef);
  @Input({ required: true }) trigger: any;
  private prevTrigger: any;

  ngAfterViewChecked() {
    if (this.trigger !== this.prevTrigger) {
      this.scrollToBottom();
      this.prevTrigger = this.trigger;
    }
  }

  private scrollToBottom(): void {
    try {
      const { scrollHeight, clientHeight } = this.el.nativeElement;
      const extra = scrollHeight - clientHeight;
      this.el.nativeElement.scrollTop = clientHeight + extra + 37;
    } catch (err) {
      console.error('Scroll to bottom failed:', err);
    }
  }
}
