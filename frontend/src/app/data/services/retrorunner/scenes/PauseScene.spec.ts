// main goes first, as the app loads it: it imports the scenes, and the
// scenes import its SceneKeys back.
import '../main';
import { NARROW_WIDTH, Rect } from '../utils/runner-layout';
import { pauseMenu } from './PauseScene';

function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

describe('PauseScene', () => {
  describe('pauseMenu', () => {
    const cx = NARROW_WIDTH / 2;
    const menu = pauseMenu(cx, 300);

    it('offers what the hidden bar of the page did: go on, start over, share the level and leave', () => {
      expect(menu.map((button) => button.choice)).toEqual(['resume', 'restart', 'copy', 'exit']);
    });

    it('fits the narrowest screen, with room at both sides', () => {
      for (const { rect, choice } of menu) {
        expect(rect.x).withContext(choice).toBeGreaterThanOrEqual(8);
        expect(rect.x + rect.w).withContext(choice).toBeLessThanOrEqual(NARROW_WIDTH - 8);
      }
    });

    it('is centred', () => {
      const left = Math.min(...menu.map(({ rect }) => rect.x));
      const right = Math.max(...menu.map(({ rect }) => rect.x + rect.w));

      expect((left + right) / 2).toBe(cx);
    });

    it('keeps its buttons apart, each tall enough for a finger', () => {
      for (let i = 0; i < menu.length; i++) {
        expect(menu[i].rect.h).toBeGreaterThanOrEqual(40);
        for (let j = i + 1; j < menu.length; j++) {
          expect(overlap(menu[i].rect, menu[j].rect))
            .withContext(`${menu[i].choice} and ${menu[j].choice}`)
            .toBeFalse();
        }
      }
    });
  });
});
