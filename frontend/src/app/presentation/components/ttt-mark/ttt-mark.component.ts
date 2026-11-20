import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A Tic Tac Toe mark (X or O) that draws itself stroke by stroke when it
 * appears. Decorative: whatever shows it says in text which mark it is.
 *
 * The drawing plays when the element is created, so to replay it for a
 * different mark, render a new element (an `@if` per mark) instead of
 * changing `mark` on the same one.
 */
@Component({
  selector: 'app-ttt-mark',
  standalone: true,
  template: `
    <svg viewBox="0 0 100 100">
      @if (mark() === 'O') {
      <circle cx="50" cy="50" r="30" pathLength="1" />
      } @else {
      <line x1="22" y1="22" x2="78" y2="78" pathLength="1" />
      <line class="second" x1="78" y1="22" x2="22" y2="78" pathLength="1" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
      aspect-ratio: 1 / 1;
      color: var(--ttt-select-x-200);
    }
    :host(.is-o) {
      color: var(--ttt-select-o-200);
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 14;
      stroke-linecap: square;
    }
    /* pathLength="1" on the shapes makes a dash of 1 exactly one full
       stroke, whatever its real length. */
    line,
    circle {
      stroke-dasharray: 1;
      animation: draw 0.35s ease-out backwards;
    }
    .second {
      animation-delay: 0.18s;
    }
    circle {
      animation-duration: 0.5s;
      /* Starts the ring at the top instead of at three o'clock. */
      transform: rotate(-90deg);
      transform-origin: center;
    }
    @keyframes draw {
      from {
        stroke-dashoffset: 1;
      }
    }
  `,
  host: { 'aria-hidden': 'true', '[class.is-o]': "mark() === 'O'" },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TttMarkComponent {
  readonly mark = input.required<'X' | 'O'>();
}
