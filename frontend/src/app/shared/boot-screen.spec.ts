import {
  BOOT_EXIT_FALLBACK_MS,
  BOOT_MIN_VISIBLE_MS,
  dismissBootScreen,
} from './boot-screen';

describe('dismissBootScreen', () => {
  let screen: HTMLElement;

  beforeEach(() => {
    jasmine.clock().install();
    screen = document.createElement('div');
    screen.id = 'gg-boot';
    document.body.appendChild(screen);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    screen.remove();
  });

  const present = () => document.getElementById('gg-boot') !== null;

  it('stays until it has been seen for the minimum time', () => {
    dismissBootScreen(document, 300);

    jasmine.clock().tick(BOOT_MIN_VISIBLE_MS - 300 - 1);
    expect(screen.classList).not.toContain('is-done');

    jasmine.clock().tick(1);
    expect(screen.classList).toContain('is-done');
    expect(present()).toBeTrue();
  });

  it('leaves at once when the app took longer than the minimum to start', () => {
    dismissBootScreen(document, BOOT_MIN_VISIBLE_MS + 500);

    jasmine.clock().tick(0);
    expect(screen.classList).toContain('is-done');
  });

  it('is removed when its exit animation ends', () => {
    dismissBootScreen(document, BOOT_MIN_VISIBLE_MS);
    jasmine.clock().tick(0);

    screen.dispatchEvent(new Event('animationend'));

    expect(present()).toBeFalse();
  });

  it('ignores the animations of its own parts ending', () => {
    const part = document.createElement('span');
    screen.appendChild(part);
    dismissBootScreen(document, BOOT_MIN_VISIBLE_MS);
    jasmine.clock().tick(0);

    part.dispatchEvent(new Event('animationend', { bubbles: true }));

    expect(present()).toBeTrue();
  });

  it('is removed even if the exit animation never runs', () => {
    dismissBootScreen(document, BOOT_MIN_VISIBLE_MS);

    jasmine.clock().tick(BOOT_EXIT_FALLBACK_MS);

    expect(present()).toBeFalse();
  });

  it('does nothing when there is no boot screen', () => {
    screen.remove();

    expect(() => dismissBootScreen(document, 0)).not.toThrow();
  });
});
