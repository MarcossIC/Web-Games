import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { ChronometerServiceService } from '@app/data/services/chronometerService.service';
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
});
