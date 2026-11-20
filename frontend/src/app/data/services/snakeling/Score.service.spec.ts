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
    service.updateMaxScore();

    expect(snakelingRecords.read(store).bestScore).toBe(16);
    expect(newService().maxScore).toBe(16);
  });

  it('keeps the best score when the run did worse', () => {
    snakelingRecords.write(store, { bestScore: 40 });
    const service = newService();
    service.updateScore();
    service.updateMaxScore();

    expect(service.maxScore).toBe(40);
    expect(snakelingRecords.read(store).bestScore).toBe(40);
  });

  it('starts from zero and saves again when the stored best score is not a number', () => {
    store.write(snakelingRecords.key, JSON.stringify({ v: 1, data: { bestScore: 'undefined' } }));
    const service = newService();

    expect(service.maxScore).toBe(0);

    service.updateScore();
    service.updateMaxScore();

    expect(snakelingRecords.read(store).bestScore).toBe(8);
  });
});
