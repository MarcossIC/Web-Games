import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectorRef,
  Directive,
  ElementRef,
  inject,
  Input,
  OnChanges,
  PLATFORM_ID,
  SimpleChanges,
} from '@angular/core';

@Directive({
  standalone: true,
  selector: '[scrollToBottom]',
})
export class ScrollToBottomDirective implements AfterViewChecked {
  private el = inject(ElementRef);
  private platform = inject(PLATFORM_ID);
  @Input({ required: true }) trigger: any;
  private prevTrigger: any;

  ngAfterViewChecked() {
    if (this.trigger !== this.prevTrigger && isPlatformBrowser(this.platform)) {
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
