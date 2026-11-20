import { TestBed } from '@angular/core/testing';
import { ScoreService } from './Score.service';

const MAX_SCORE_KEY = 'snakeling-maxScore';

describe('Service: Score', () => {
  const newService = (): ScoreService =>
    TestBed.runInInjectionContext(() => new ScoreService());

  beforeEach(() => localStorage.removeItem(MAX_SCORE_KEY));
  afterEach(() => localStorage.removeItem(MAX_SCORE_KEY));

  it('saves the best score as a number and reads it back in the next session', () => {
    const service = newService();
    service.updateScore();
    service.updateScore();
    service.updateMaxScore();

    expect(localStorage.getItem(MAX_SCORE_KEY)).toBe('16');
    expect(newService().maxScore).toBe(16);
  });

  it('starts from zero and saves again when the stored best score is not a number', () => {
    localStorage.setItem(MAX_SCORE_KEY, 'undefined');
    const service = newService();

    expect(service.maxScore).toBe(0);

    service.updateScore();
    service.updateMaxScore();

    expect(localStorage.getItem(MAX_SCORE_KEY)).toBe('8');
  });
});
