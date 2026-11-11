import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/** Palette keys used by the 8x8 emblem maps in `assets/constants/games.ts`. */
const PALETTE: Record<string, string> = {
  M: '#ff2e88',
  C: '#5ee6ff',
  Y: '#ffe14a',
  G: '#5dfc9a',
  O: '#ff9a3d',
  P: '#b78bff',
  R: '#ff5c5c',
  B: '#66b2ff',
  W: '#ece9f7',
};
const EMPTY_PIXEL = '#14122a';

/** Decorative 8x8 pixel-art emblem drawn from a 64-character map. */
@Component({
  selector: 'app-pixel-emblem',
  standalone: true,
  template: `
    @for (color of pixels(); track $index) {
    <span [style.background]="color"></span>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(8, minmax(0, 1fr));
      gap: 2px;
      aspect-ratio: 1 / 1;
      padding: 12%;
      background: var(--gg-ink);
      border: 2px solid var(--gg-line);
    }
  `,
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PixelEmblemComponent {
  readonly map = input.required<string>();

  protected readonly pixels = computed(() =>
    Array.from(this.map(), (key) => PALETTE[key] ?? EMPTY_PIXEL)
  );
}
