import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BreakerControllerService } from '@app/data/services/breaker/BreakerController.service';
import { emptyRecords } from '@app/data/services/breaker/engine/records';
import { BreakerGameComponent } from './breaker-game.component';

describe('BreakerGameComponent', () => {
  it('never boots Phaser on the server', () => {
    TestBed.configureTestingModule({
      imports: [BreakerGameComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: BreakerControllerService, useValue: { records: signal(emptyRecords()), phase: signal('loading'), captureMouse: signal(true) } },
      ],
    });
    const fixture = TestBed.createComponent(BreakerGameComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.game).toBeUndefined();
    fixture.destroy();
  });
});
