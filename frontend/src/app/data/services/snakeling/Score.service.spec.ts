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
    service.eatApple();
    service.eatApple();
    service.updateMaxScore('portal');

    // 8 for the first apple, 10 for the second (x1.2).
    expect(snakelingRecords.read(store).bestScore).toBe(18);
    expect(newService().bestFor('portal')).toBe(18);
  });

  it('keeps the best score when the run did worse', () => {
    snakelingRecords.write(store, { bestScore: 40, bestClassic: 0, bestTimeAttack: 0, bestHard: 0 });
    const service = newService();
    service.eatApple();
    service.updateMaxScore('portal');

    expect(service.bestFor('portal')).toBe(40);
    expect(snakelingRecords.read(store).bestScore).toBe(40);
  });

  it('starts from zero and saves again when the stored best score is not a number', () => {
    store.write(snakelingRecords.key, JSON.stringify({ v: 2, data: { bestScore: 'undefined' } }));
    const service = newService();

    expect(service.bestFor('portal')).toBe(0);

    service.eatApple();
    service.updateMaxScore('portal');

    expect(snakelingRecords.read(store).bestScore).toBe(8);
  });

  it('keeps a best score for each mode', () => {
    const service = newService();
    service.eatApple();
    service.updateMaxScore('classic');

    expect(service.bestFor('classic')).toBe(8);
    expect(service.bestFor('portal')).toBe(0);

    service.eatApple();
    service.updateMaxScore('portal');

    expect(snakelingRecords.read(store)).toEqual({
      bestScore: 18,
      bestClassic: 8,
      bestTimeAttack: 0,
      bestHard: 0,
    });
  });

  it('reads a record saved with only the Portal field as a Portal record', () => {
    store.write(snakelingRecords.key, JSON.stringify({ v: 2, data: { bestScore: 96 } }));
    const service = newService();

    expect(service.bestFor('portal')).toBe(96);
    expect(service.bestFor('classic')).toBe(0);
  });

  it('drops the records of the scoring before the combo', () => {
    store.write(snakelingRecords.key, JSON.stringify({ v: 1, data: { bestScore: 96 } }));

    expect(newService().bestFor('portal')).toBe(0);
  });

  it('keeps the combo while each apple comes in time, and loses it when time runs out', () => {
    const service = newService();
    service.eatApple();
    service.tick(3000);
    service.eatApple();

    expect(service.combo).toBe(2);
    expect(service.multiplier()).toBe(1.2);

    service.tick(5000);

    expect(service.combo).toBe(0);
    expect(service.comboShare()).toBe(0);
    expect(service.bestCombo).toBe(2);
    expect(service.apples).toBe(2);
  });

  it('does not count the golden apple as an apple, nor in the combo', () => {
    const service = newService();
    service.eatGoldenApple();

    expect(service.score).toBe(40);
    expect(service.apples).toBe(0);
    expect(service.combo).toBe(0);
  });
});
