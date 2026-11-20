import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { GameName } from '@app/data/models/GameName.enum';
import { ChronometerServiceService } from '@app/data/services/chronometerService.service';
import { PointsService } from '@app/data/services/tetris/Points.service';
import { tetrisRecords } from '@app/data/services/tetris/tetris-saves';
import { GAME_STORE, type KeyValueStore, memoryStore } from '@app-persistence';
import { ChronometerComponent } from './chronometer.component';

describe('ChronometerComponent', () => {
  let fixture: ComponentFixture<ChronometerComponent>;

  // No PointsService is provided here on purpose: that is the situation of
  // every game other than Tetris, which is the only route that provides it.
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChronometerComponent],
    }).compileComponents();
  });

  it('runs in a game that has no Tetris score', fakeAsync(() => {
    fixture = TestBed.createComponent(ChronometerComponent);
    fixture.detectChanges();
    // A game starts paused; this is what its Play button does.
    TestBed.inject(ChronometerServiceService).reset();

    tick(3000);

    expect(fixture.componentInstance.time()).toBe('00:03');
    discardPeriodicTasks();
  }));

  describe('in Tetris', () => {
    let store: KeyValueStore;

    beforeEach(() => {
      store = memoryStore();
      TestBed.configureTestingModule({
        providers: [PointsService, { provide: GAME_STORE, useValue: store }],
      });
    });

    it('a short first game of the visit does not replace the best time saved before', fakeAsync(() => {
      tetrisRecords.write(store, { bestScore: 0, bestLevel: 1, bestTimeSeconds: 200 });
      fixture = TestBed.createComponent(ChronometerComponent);
      fixture.detectChanges();
      const chronometer = TestBed.inject(ChronometerServiceService);
      chronometer.updateGameName(GameName.TETRIS);
      chronometer.reset();

      tick(65_000);
      chronometer.gameOver = true;
      tick(1000);

      expect(TestBed.inject(PointsService).time).toBe('01:05');
      expect(tetrisRecords.read(store).bestTimeSeconds).toBe(200);
      discardPeriodicTasks();
    }));
  });
});
