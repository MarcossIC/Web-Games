import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrapFocusDirective } from './TrapFocus.directive';

@Component({
  standalone: true,
  imports: [TrapFocusDirective],
  template: `
    <button class="outside" type="button">outside</button>
    <div trapFocus role="dialog" aria-modal="true">
      <button class="first" type="button">first</button>
      <button class="hidden" type="button" disabled>disabled</button>
      <a class="middle" href="#">middle</a>
      <button class="last" type="button">last</button>
    </div>
  `,
})
class HostComponent {}

describe('TrapFocusDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  const q = (selector: string) => (fixture.nativeElement as HTMLElement).querySelector(selector) as HTMLElement;

  const tab = (from: HTMLElement, shift = false): KeyboardEvent => {
    from.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true });
    from.dispatchEvent(event);
    return event;
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => (fixture.nativeElement as HTMLElement).remove());

  it('Tab on the last control wraps to the first', () => {
    const event = tab(q('.last'));
    expect(event.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(q('.first'));
  });

  it('Shift+Tab on the first control wraps to the last', () => {
    const event = tab(q('.first'), true);
    expect(event.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(q('.last'));
  });

  it('leaves Tab alone between the controls inside', () => {
    expect(tab(q('.first')).defaultPrevented).toBeFalse();
    expect(tab(q('.middle'), true).defaultPrevented).toBeFalse();
  });

  it('pulls a Tab that starts outside the dialog back in', () => {
    // Focus can be outside after a click on the page behind the scrim.
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    q('.outside').focus();
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(q('.first'));
  });
});
