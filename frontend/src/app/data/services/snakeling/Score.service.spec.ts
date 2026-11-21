import { TestBed } from '@angular/core/testing';
import { GAME_STORE, type KeyValueStore, memoryStore } from '@app-persistence';
import { ScoreService } from './Score.service';
import { snakelingRecords } from './snakeling-saves';

describe('Service: Score', () => {
  let store: KeyValueStore;

  beforeEach(() => {
    store = memoryStore();
    TestBed.configureTestingModule({ providers: [{ provide: GAME_STORE, useValue: store }] });
  });

  const newService = (): ScoreService => TestBed.runInInjectionContext(() => new ScoreService());

  it('saves the best score and reads it back in the next session', () => {
    const service = newService();
    service.updateScore();
    service.updateScore();
    service.updateMaxScore('portal');

    expect(snakelingRecords.read(store).bestScore).toBe(16);
    expect(newService().bestFor('portal')).toBe(16);
  });

  it('keeps the best score when the run did worse', () => {
    snakelingRecords.write(store, { bestScore: 40, bestClassic: 0 });
    const service = newService();
    service.updateScore();
    service.updateMaxScore('portal');

    expect(service.bestFor('portal')).toBe(40);
    expect(snakelingRecords.read(store).bestScore).toBe(40);
  });

  it('starts from zero and saves again when the stored best score is not a number', () => {
    store.write(snakelingRecords.key, JSON.stringify({ v: 1, data: { bestScore: 'undefined' } }));
    const service = newService();

    expect(service.bestFor('portal')).toBe(0);

    service.updateScore();
    service.updateMaxScore('portal');

    expect(snakelingRecords.read(store).bestScore).toBe(8);
  });

  it('keeps a best score for each mode', () => {
    const service = newService();
    service.updateScore();
    service.updateMaxScore('classic');

    expect(service.bestFor('classic')).toBe(8);
    expect(service.bestFor('portal')).toBe(0);

    service.updateScore();
    service.updateMaxScore('portal');

    expect(snakelingRecords.read(store)).toEqual({ bestScore: 16, bestClassic: 8 });
  });

  it('reads records saved before modes existed as Portal records', () => {
    store.write(snakelingRecords.key, JSON.stringify({ v: 1, data: { bestScore: 96 } }));
    const service = newService();

    expect(service.bestFor('portal')).toBe(96);
    expect(service.bestFor('classic')).toBe(0);
  });
});
