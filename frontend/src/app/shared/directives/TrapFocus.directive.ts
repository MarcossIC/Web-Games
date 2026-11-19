import { Directive, ElementRef, inject } from '@angular/core';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keeps Tab and Shift+Tab inside a dialog that declares aria-modal="true":
 * past the last control focus wraps to the first, and the other way round.
 * A Tab that starts outside (after a click behind the scrim) is pulled back in.
 */
@Directive({
  standalone: true,
  selector: '[trapFocus]',
  host: { '(document:keydown)': 'onKeyDown($event)' },
})
export class TrapFocusDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const root = this.host.nativeElement;
    const controls = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (controls.length === 0) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    const active = document.activeElement;
    const inside = active instanceof Node && root.contains(active);

    let target: HTMLElement | null = null;
    if (!inside) target = event.shiftKey ? last : first;
    else if (event.shiftKey && active === first) target = last;
    else if (!event.shiftKey && active === last) target = first;
    if (!target) return;

    event.preventDefault();
    target.focus();
  }
}
