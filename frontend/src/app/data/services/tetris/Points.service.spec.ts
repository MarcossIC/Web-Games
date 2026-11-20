import { TestBed } from '@angular/core/testing';
import { GAME_STORE, type KeyValueStore, memoryStore } from '@app-persistence';
import { PointsService } from './Points.service';
import { tetrisRecords } from './tetris-saves';

describe('Service: Points', () => {
  let store: KeyValueStore;

  beforeEach(() => {
    store = memoryStore();
    TestBed.configureTestingModule({ providers: [{ provide: GAME_STORE, useValue: store }] });
  });

  const newService = (): PointsService => TestBed.runInInjectionContext(() => new PointsService());

  /** Plays a game worth `lines` cleared lines. */
  const play = (service: PointsService, lines: number) => {
    for (let i = 0; i < lines; i++) service.addScore();
    service.calculateLevel();
    service.updateMaxPoints();
  };

  it('starts with no records: score 0, level 1 and time 00:00', () => {
    const service = newService();

    expect([service.maxScore, service.maxLevel, service.maxTime]).toEqual([0, 1, '00:00']);
  });

  it('saves a better score and level, and reads them back in the next session', () => {
    play(newService(), 6);

    expect(tetrisRecords.read(store)).toEqual({ bestScore: 600, bestLevel: 2, bestTimeSeconds: 0 });
    const next = newService();
    expect([next.maxScore, next.maxLevel]).toEqual([600, 2]);
  });

  it('keeps the records when the game did worse', () => {
    tetrisRecords.write(store, { bestScore: 900, bestLevel: 3, bestTimeSeconds: 200 });
    const service = newService();

    play(service, 1);
    service.recordTime(30);

    expect(tetrisRecords.read(store)).toEqual({ bestScore: 900, bestLevel: 3, bestTimeSeconds: 200 });
    expect([service.maxScore, service.maxLevel, service.maxTime]).toEqual([900, 3, '03:20']);
  });

  it('keeps the longest time, not the first time of the visit', () => {
    tetrisRecords.write(store, { bestScore: 0, bestLevel: 1, bestTimeSeconds: 200 });
    const service = newService();

    service.recordTime(65);
    expect(service.maxTime).toBe('03:20');

    service.recordTime(254);
    expect(service.maxTime).toBe('04:14');
    expect(tetrisRecords.read(store).bestTimeSeconds).toBe(254);
  });
});
