import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'rook-piece',
  template: `
    <svg width="54" height="54" viewBox="0 0 54 54" fill="none" id="rook">
      <path
        class="border-fill"
        d="M19.5 3.75C20.0464 3.75 20.5587 3.89609 21 4.15135C21.4413 3.89609 21.9536 3.75 22.5 3.75H30.75C31.2964 3.75 31.8087 3.89609 32.25 4.15135C32.6913 3.89609 33.2036 3.75 33.75 3.75H41.25C42.9069 3.75 44.25 5.09315 44.25 6.75V13.5C44.25 14.4443 43.8054 15.3334 43.05 15.9L38.4209 19.3718L39.7317 31.1687C40.0787 34.2919 41.5324 35.8765 43.65 38.7C44.0395 39.2193 44.25 39.8509 44.25 40.5V46.5C44.25 48.1569 42.9069 49.5 41.25 49.5H12C10.3431 49.5 9 48.1569 9 46.5V40.5C9 39.8509 9.21053 39.2193 9.6 38.7C11.7176 35.8765 13.1713 34.2919 13.5183 31.1687L14.8291 19.3718L10.2 15.9C9.44458 15.3334 9 14.4443 9 13.5V6.75C9 5.09315 10.3431 3.75 12 3.75H19.5Z"
        fill="#F4F7FA"
      />
      <path
        d="M12 6.75H19.5V11.25H22.5V6.75H30.75V11.25H33.75V6.75H41.25V13.5L35.25 18L36.75 31.5H16.5L18 18L12 13.5V6.75Z"
        fill="currentColor"
      />
      <path
        d="M16.5 34.5H36.75L41.25 40.5V46.5H12V40.5L16.5 34.5Z"
        fill="currentColor"
      />
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RookPieceComponent {}
