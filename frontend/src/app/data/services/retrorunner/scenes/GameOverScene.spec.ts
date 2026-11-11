// main goes first, as the app loads it: it imports the scenes, and the
// scenes import its SceneKeys back.
import '../main';
import { BEST_SCORE_KEY, RunSummary } from '../utils/run-score';
import { describeRun, recordBest, retryChoice } from './GameOverScene';

const RUN: RunSummary = {
  timeMs: 83_400,
  distance: 2412,
  coins: 42,
  maxCombo: 4,
  coinPoints: 196,
  rhythmPoints: 620.5,
  points: 816,
  score: 3228,
};

/** A storage that only lives in the test. */
function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    items,
  };
}

describe('GameOverScene', () => {
  describe('describeRun', () => {
    it('shows how long the run lasted, the distance and the points apart, then what the points came from', () => {
      expect(describeRun(RUN)).toEqual([
        'Time 1:23  |  Distance 2412  +  Points 816',
        'Coins 42 (+196)  |  Combo x4  |  Rhythm +620',
      ]);
    });

    it('shows no combo for a run without coins', () => {
      const run = { ...RUN, coins: 0, maxCombo: 0, coinPoints: 0 };

      expect(describeRun(run)[1]).toBe('Coins 0 (+0)  |  Combo -  |  Rhythm +620');
    });
  });

  describe('retryChoice', () => {
    const press = (shiftKey = false, repeat = false) => ({ shiftKey, repeat });

    it('starts a new run with Space, once the screen has been up a moment', () => {
      expect(retryChoice(press(), 700)).toBe('new-seed');
    });

    it('plays the same seed again with Shift+Space', () => {
      expect(retryChoice(press(true), 700)).toBe('same-seed');
    });

    it('ignores the Space still held down from the last jump', () => {
      expect(retryChoice(press(false, true), 5000)).toBeNull();
    });

    it('ignores a press as the screen appears, so a jump in the fall does not skip it', () => {
      expect(retryChoice(press(), 200)).toBeNull();
    });
  });

  describe('recordBest', () => {
    it('keeps a better score as the best one', () => {
      const storage = memoryStorage({ [BEST_SCORE_KEY]: '3000' });

      expect(recordBest(3228, storage)).toBe(3228);
      expect(storage.items.get(BEST_SCORE_KEY)).toBe('3228');
    });

    it('leaves the best one when the run did worse', () => {
      const storage = memoryStorage({ [BEST_SCORE_KEY]: '5000' });

      expect(recordBest(3228, storage)).toBe(5000);
      expect(storage.items.get(BEST_SCORE_KEY)).toBe('5000');
    });

    it('starts over from the scores of this scoring, not the old ones', () => {
      const storage = memoryStorage({ retroRunnerHighScore: '6635' });

      expect(recordBest(3228, storage)).toBe(3228);
    });
  });
});
