/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { GameStatusService } from './GameStatusService.service';

describe('Service: GameStatus', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GameStatusService]
    });
  });

  it('should ...', inject([GameStatusService], (service: GameStatusService) => {
    expect(service).toBeTruthy();
  }));
});
